/**
 * Event Emitter — Redis Pub/Sub wrapper for real-time job events
 * Workers publish events; SSE endpoint subscribes and streams to clients.
 */

import { getRedisConnection, getSubscriberConnection } from '@/lib/queue/connection';

// ─── Event Types ─────────────────────────────────────────────────────────────

export type JobEventType =
    | 'agent-thinking'
    | 'agent-response'
    | 'phase-change'
    | 'cache-hit'
    | 'agent-fallback'
    | 'consensus-start'
    | 'consensus-complete'
    | 'job-progress'
    | 'job-complete'
    | 'job-error';

export interface JobEvent {
    type: JobEventType;
    jobId: string;
    timestamp: string;
    data: Record<string, any>;
}

/**
 * Emit a job event via Redis Pub/Sub
 */
export async function emitJobEvent(jobId: string, type: JobEventType, data: Record<string, any>): Promise<void> {
    const event: JobEvent = {
        type,
        jobId,
        timestamp: new Date().toISOString(),
        data,
    };

    const redis = getRedisConnection();
    await redis.publish(`job:${jobId}`, JSON.stringify(event));
}

/**
 * Subscribe to job events. Returns an unsubscribe function.
 */
export function subscribeToJob(
    jobId: string,
    callback: (event: JobEvent) => void
): () => void {
    const subscriber = getSubscriberConnection();
    const channel = `job:${jobId}`;

    const handler = (_channel: string, message: string) => {
        try {
            const event = JSON.parse(message) as JobEvent;
            callback(event);
        } catch (error) {
            console.error('[EventEmitter] Failed to parse event:', error);
        }
    };

    subscriber.subscribe(channel);
    subscriber.on('message', handler);

    // Return unsubscribe function
    return () => {
        subscriber.unsubscribe(channel);
        subscriber.removeListener('message', handler);
    };
}

// ─── Helper emitters for common events ──────────────────────────────────────

export async function emitAgentThinking(jobId: string, agentName: string, agentRole: string, round: number): Promise<void> {
    await emitJobEvent(jobId, 'agent-thinking', { agentName, agentRole, round });
}

export async function emitAgentResponse(
    jobId: string,
    agentName: string,
    agentRole: string,
    agentColor: string,
    round: number,
    reasoning: string,
    modelUsed: string,
    usedFallback: boolean,
    fallbackReason?: string,
): Promise<void> {
    await emitJobEvent(jobId, 'agent-response', {
        agentName,
        agentRole,
        agentColor,
        round,
        reasoning,
        modelUsed,
        usedFallback,
        fallbackReason,
    });
}

export async function emitPhaseChange(jobId: string, phase: string, message: string): Promise<void> {
    await emitJobEvent(jobId, 'phase-change', { phase, message });
}

export async function emitJobComplete(jobId: string, result: Record<string, any>): Promise<void> {
    await emitJobEvent(jobId, 'job-complete', result);
}

export async function emitJobError(jobId: string, error: string): Promise<void> {
    await emitJobEvent(jobId, 'job-error', { error });
}
