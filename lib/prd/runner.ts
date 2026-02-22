/**
 * PRD Runner — Core logic for generating PRDs
 * This is used by both the background worker and the inline fallback.
 */

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

export interface RunnerOptions {
    jobId: string;
    topic: string;
    projectType: string;
    modelId?: string;
    userKeys?: Record<string, string>;
    maxRounds?: number;
}

import { updateInlineJob } from '../queue/producers';

/**
 * Executes the full PRD generation process
 */
export async function runPRDGeneration({
    jobId,
    topic,
    projectType,
    modelId,
    userKeys,
    maxRounds,
}: RunnerOptions) {
    try {
        updateInlineJob(jobId, { status: 'active', progress: 5 });

        // ── Phase 1: Guardrail scan ──────────────────────────────
        await emitPhaseChange(jobId, 'guardrail', 'Scanning input for security threats...');
        const sanitizedTopic = assertSafe(topic);
        updateInlineJob(jobId, { progress: 10 });

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
            updateInlineJob(jobId, { status: 'completed', progress: 100, result: { prdState: cached, fromCache: true } });
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
                updateInlineJob(jobId, { progress: 10 + Math.floor((round / rounds) * 60) });
            },
        });

        const debateResult = await engine.runDebate(prdAgents);

        // ── Phase 4: Consensus synthesis ─────────────────────────
        await emitPhaseChange(jobId, 'consensus', 'Synthesizing final PRD from debate...');
        updateInlineJob(jobId, { progress: 80 });
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

        // ── Phase 5: Cache and persist ───────────────────────────
        await emitPhaseChange(jobId, 'persist', 'Saving PRD...');
        updateInlineJob(jobId, { progress: 95 });
        await cachePRD(sanitizedTopic, projectType, consensus.prdState);

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
        updateInlineJob(jobId, { status: 'completed', progress: 100, result });

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await emitJobError(jobId, errorMessage);
        updateInlineJob(jobId, { status: 'failed', error: errorMessage });
        throw error;
    }
}
