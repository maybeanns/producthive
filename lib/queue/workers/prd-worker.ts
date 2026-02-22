/**
 * PRD Worker — BullMQ worker that processes PRD generation jobs
 * 
 * Flow: Guardrail scan → Cache check → Debate → Consensus → Persist → Cache result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../connection';
import type { PRDJobData } from '../producers';
import { prdAgents } from '@/lib/agents/agent-config';
import { DebateEngine } from '@/lib/orchestration/debate-engine';
import { synthesizeConsensus } from '@/lib/orchestration/consensus-agent';
import { assertSafe } from '@/lib/ai/guardrails';
import { getCachedPRD, cachePRD } from '@/lib/cache/prd-cache';
import {
    emitAgentThinking,
    emitAgentResponse,
    emitPhaseChange,
    emitJobComplete,
    emitJobError,
    emitJobEvent,
} from '@/lib/events/emitter';
import { getDefaultModelId } from '@/lib/ai/model-registry';

/**
 * Create and return the PRD worker
 */
export function createPRDWorker(): Worker {
    const worker = new Worker(
        'prd-generation',
        async (job: Job<PRDJobData>) => {
            const { topic, projectType, modelId, userKeys, maxRounds } = job.data;
            const jobId = job.id!;

            try {
                // ── Phase 1: Guardrail scan ──────────────────────────────
                await emitPhaseChange(jobId, 'guardrail', 'Scanning input for security threats...');
                const sanitizedTopic = assertSafe(topic);

                // ── Phase 2: Cache check ─────────────────────────────────
                await emitPhaseChange(jobId, 'cache-check', 'Checking for cached PRD...');
                const cached = await getCachedPRD(sanitizedTopic, projectType);

                if (cached) {
                    await emitJobEvent(jobId, 'cache-hit', {
                        message: 'Found cached PRD! Loading instantly.',
                    });
                    await emitJobComplete(jobId, {
                        prdState: cached,
                        fromCache: true,
                    });
                    return { prdState: cached, fromCache: true };
                }

                // ── Phase 3: Multi-round debate ─────────────────────────
                await emitPhaseChange(jobId, 'debate', 'Starting multi-agent debate...');

                const selectedModel = modelId || getDefaultModelId();
                const rounds = maxRounds || 3;

                const engine = new DebateEngine(sanitizedTopic, projectType, {
                    maxRounds: rounds,
                    modelId: selectedModel,
                    userKeys,
                    onAgentThinking: async (agent, round) => {
                        await emitAgentThinking(jobId, agent.name, agent.role, round);
                    },
                    onAgentResponse: async (entry) => {
                        await emitAgentResponse(
                            jobId,
                            entry.agent.name,
                            entry.agent.role,
                            entry.agent.color || '#6366F1',
                            entry.round,
                            entry.response.reasoning,
                            entry.modelUsed,
                            entry.usedFallback,
                            entry.fallbackReason,
                        );
                    },
                    onRoundComplete: async (round) => {
                        await emitPhaseChange(jobId, 'debate', `Round ${round} complete`);
                        await job.updateProgress(Math.floor((round / rounds) * 70));
                    },
                });

                const debateResult = await engine.runDebate(prdAgents);

                // ── Phase 4: Consensus synthesis ─────────────────────────
                await emitPhaseChange(jobId, 'consensus', 'Synthesizing final PRD from debate...');
                await emitJobEvent(jobId, 'consensus-start', {
                    totalEntries: debateResult.transcript.length,
                    rounds: debateResult.totalRounds,
                    converged: debateResult.converged,
                });

                const consensus = await synthesizeConsensus(
                    debateResult.transcript,
                    sanitizedTopic,
                    projectType,
                    selectedModel,
                    userKeys,
                );

                await job.updateProgress(90);

                // ── Phase 5: Cache and persist ───────────────────────────
                await emitPhaseChange(jobId, 'persist', 'Saving PRD...');
                await cachePRD(sanitizedTopic, projectType, consensus.prdState);

                await job.updateProgress(100);

                const result = {
                    prdState: consensus.prdState,
                    keyDecisions: consensus.keyDecisions,
                    debateStats: {
                        totalRounds: debateResult.totalRounds,
                        totalEntries: debateResult.transcript.length,
                        converged: debateResult.converged,
                        modelUsed: consensus.modelUsed,
                    },
                    fromCache: false,
                };

                await emitJobEvent(jobId, 'consensus-complete', {
                    keyDecisions: consensus.keyDecisions,
                });
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
            concurrency: 2,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[PRD Worker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[PRD Worker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
}
