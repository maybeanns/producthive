/**
 * Build Worker — BullMQ worker for build pipeline
 * 
 * Flow: Plan → Jira → GitHub init → Code gen (parallel) → Test → Commit
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../connection';
import type { BuildJobData } from '../producers';
import { executeWithCircuitBreaker } from '@/lib/ai/circuit-breaker';
import type { AIProvider } from '@/lib/ai/providers/types';
import { getDefaultModelId } from '@/lib/ai/model-registry';
import {
    emitPhaseChange,
    emitJobComplete,
    emitJobError,
    emitJobEvent,
} from '@/lib/events/emitter';

/**
 * Create and return the Build pipeline worker
 */
export function createBuildWorker(): Worker {
    const worker = new Worker(
        'build-pipeline',
        async (job: Job<BuildJobData>) => {
            const { prdState, modelId, userKeys, jiraConfig, githubConfig } = job.data;
            const jobId = job.id!;
            const selectedModel = modelId || getDefaultModelId();

            try {
                // ── Phase 1: Development Planning ────────────────────────
                await emitPhaseChange(jobId, 'planning', 'Creating development plan from PRD...');

                const planResult = await executeWithCircuitBreaker(
                    selectedModel,
                    async (provider: AIProvider) => {
                        const prompt = `Based on this PRD, create a detailed development plan with tasks, architecture, tech stack, and file structure.

PRD:
- Project: ${prdState.projectName}
- Type: ${prdState.projectType}
- Overview: ${prdState.overview}
- Objectives: ${(prdState.objectives || []).join(', ')}
- Tech: ${JSON.stringify(prdState.technicalRequirements || {})}

Return JSON with: { tasks: string[], architecture: string, techStack: Record<string, string>, fileStructure: Record<string, string> }`;

                        return await provider.generateJSON<{
                            tasks: string[];
                            architecture: string;
                            techStack: Record<string, string>;
                            fileStructure: Record<string, string>;
                        }>(prompt, 'You are an expert software architect. Create a detailed, production-ready development plan.');
                    },
                    userKeys,
                );

                const plan = planResult.result;
                await job.updateProgress(15);

                // ── Phase 2: Jira Task Creation (optional, non-blocking) ─
                let jiraResult = { success: false, taskCount: 0, url: '' };
                if (jiraConfig?.host && jiraConfig?.email && jiraConfig?.apiToken && jiraConfig?.projectKey) {
                    try {
                        await emitPhaseChange(jobId, 'jira', 'Creating Jira tasks...');
                        const { JiraClient } = await import('@/lib/jira/client');
                        const jira = new JiraClient({
                            host: jiraConfig.host,
                            email: jiraConfig.email,
                            apiToken: jiraConfig.apiToken,
                            projectKey: jiraConfig.projectKey,
                        });

                        // Create tasks with retry
                        for (const task of plan.tasks.slice(0, 20)) {
                            try {
                                await jira.createIssue({
                                    summary: task,
                                    description: `Auto-generated from PRD: ${prdState.projectName}`,
                                    issuetype: { name: 'Task' },
                                });
                                jiraResult.taskCount++;
                            } catch (jiraErr) {
                                console.warn(`[Build Worker] Jira task creation failed for: ${task}`, jiraErr);
                            }
                        }
                        jiraResult.success = true;
                        jiraResult.url = `${jiraConfig.host}/browse/${jiraConfig.projectKey}`;
                    } catch (jiraError) {
                        console.warn('[Build Worker] Jira integration failed, continuing pipeline:', jiraError);
                        await emitJobEvent(jobId, 'phase-change', {
                            phase: 'jira',
                            message: 'Jira integration failed — continuing without Jira',
                        });
                    }
                }
                await job.updateProgress(25);

                // ── Phase 3: GitHub Repository Setup ─────────────────────
                let repoUrl = '';
                const ghToken = githubConfig?.token || process.env.GITHUB_TOKEN;
                const ghOrg = githubConfig?.org || process.env.GITHUB_ORG;

                if (ghToken && ghOrg) {
                    try {
                        await emitPhaseChange(jobId, 'github-init', 'Creating GitHub repository...');
                        const { GitHubClient } = await import('@/lib/github/mcp-client');
                        const repoName = githubConfig?.repoName || prdState.projectName || 'producthive-app';
                        const github = new GitHubClient({
                            token: ghToken,
                            owner: ghOrg,
                            repo: repoName,
                        });
                        repoUrl = await github.createRepository(repoName, false);
                    } catch (ghError) {
                        console.warn('[Build Worker] GitHub repo creation failed:', ghError);
                        await emitJobEvent(jobId, 'phase-change', {
                            phase: 'github-init',
                            message: 'GitHub setup failed — code will be generated but not pushed',
                        });
                    }
                }
                await job.updateProgress(30);

                // ── Phase 4: Parallel Code Generation ────────────────────
                await emitPhaseChange(jobId, 'code-gen', 'Generating code files...');

                const files: { path: string; content: string; language: string }[] = [];
                const fileEntries = Object.entries(plan.fileStructure || {});

                // Generate files in batches of 3 (parallel within batch)
                const batchSize = 3;
                for (let i = 0; i < fileEntries.length; i += batchSize) {
                    const batch = fileEntries.slice(i, i + batchSize);

                    const batchResults = await Promise.allSettled(
                        batch.map(async ([filePath, description]) => {
                            const codeResult = await executeWithCircuitBreaker(
                                selectedModel,
                                async (provider: AIProvider) => {
                                    const prompt = `Generate the complete file content for: ${filePath}

Description: ${description}
Project: ${prdState.projectName}
Tech Stack: ${JSON.stringify(plan.techStack)}
Architecture: ${plan.architecture}

Generate production-ready, clean code with proper imports, error handling, and comments. Return ONLY the code, no markdown.`;

                                    return await provider.generate(prompt, 'You are an expert software developer. Generate clean, production-ready code.');
                                },
                                userKeys,
                            );

                            return {
                                path: filePath,
                                content: codeResult.result,
                                language: filePath.split('.').pop() || 'text',
                            };
                        })
                    );

                    for (const result of batchResults) {
                        if (result.status === 'fulfilled') {
                            files.push(result.value);
                            await emitJobEvent(jobId, 'job-progress', {
                                phase: 'code-gen',
                                file: result.value.path,
                                totalFiles: fileEntries.length,
                                completedFiles: files.length,
                            });
                        }
                    }

                    const codeGenProgress = fileEntries.length > 0 ?
                        Math.floor((files.length / fileEntries.length) * 40) : 40;
                    await job.updateProgress(30 + codeGenProgress);
                }

                // ── Phase 5: Generate README.md ──────────────────────────
                await emitPhaseChange(jobId, 'readme', 'Generating README...');
                try {
                    const readmeResult = await executeWithCircuitBreaker(
                        selectedModel,
                        async (provider: AIProvider) => {
                            return await provider.generate(
                                `Generate a professional README.md for the project "${prdState.projectName}".
Overview: ${prdState.overview}
Tech Stack: ${JSON.stringify(plan.techStack)}
Features: ${(prdState.objectives || []).join(', ')}

Include: badges, installation, usage, project structure, contributing, and license sections.`,
                                'Generate a professional, complete README.md file.'
                            );
                        },
                        userKeys,
                    );
                    files.push({ path: 'README.md', content: readmeResult.result, language: 'md' });
                } catch {
                    console.warn('[Build Worker] README generation failed');
                }

                // ── Phase 6: Generate .gitignore ─────────────────────────
                const techStack = Object.values(plan.techStack || {}).join(', ').toLowerCase();
                let gitignoreContent = 'node_modules/\n.env\n.env.local\ndist/\nbuild/\n.next/\n*.log\n';
                if (techStack.includes('python')) gitignoreContent += '__pycache__/\n*.pyc\nvenv/\n';
                if (techStack.includes('java')) gitignoreContent += 'target/\n*.class\n';
                files.push({ path: '.gitignore', content: gitignoreContent, language: 'gitignore' });

                await job.updateProgress(80);

                // ── Phase 7: Push to GitHub (chunked commits) ────────────
                if (repoUrl && ghToken && ghOrg) {
                    try {
                        await emitPhaseChange(jobId, 'github-push', 'Pushing code to GitHub...');
                        const { GitHubClient } = await import('@/lib/github/mcp-client');
                        const repoName = githubConfig?.repoName || prdState.projectName || 'producthive-app';
                        const github = new GitHubClient({
                            token: ghToken,
                            owner: ghOrg,
                            repo: repoName,
                        });

                        // Chunk files: max 50 per commit
                        const CHUNK_SIZE = 50;
                        for (let i = 0; i < files.length; i += CHUNK_SIZE) {
                            const chunk = files.slice(i, i + CHUNK_SIZE);
                            const commitNum = Math.floor(i / CHUNK_SIZE) + 1;
                            const totalCommits = Math.ceil(files.length / CHUNK_SIZE);

                            await github.commitFiles(
                                chunk.map(f => ({ path: f.path, content: f.content })),
                                totalCommits === 1
                                    ? `Initial build: ${prdState.projectName}`
                                    : `Build commit ${commitNum}/${totalCommits}: ${prdState.projectName}`,
                                'main'
                            );
                        }
                    } catch (pushError) {
                        console.warn('[Build Worker] GitHub push failed:', pushError);
                    }
                }

                await job.updateProgress(100);

                const result = {
                    files: files.map(f => ({ path: f.path, language: f.language })),
                    totalFiles: files.length,
                    repoUrl: repoUrl || null,
                    jira: jiraResult,
                    plan: {
                        tasks: plan.tasks,
                        architecture: plan.architecture,
                        techStack: plan.techStack,
                    },
                };

                await emitJobComplete(jobId, result);
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await emitJobError(jobId, errorMessage);
                throw error;
            }
        },
        {
            connection: getRedisConnectionOptions(),
            concurrency: 1,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Build Worker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Build Worker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
}
