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

// ─── Memory Fallback ────────────────────────────────────────────────────────
// Used when Redis is unavailable (local dev without Docker)
const memoryEmitters = new Map<string, Set<(event: JobEvent) => void>>();

/**
 * Emit a job event via Redis Pub/Sub with Memory Fallback
 */
export async function emitJobEvent(jobId: string, type: JobEventType, data: Record<string, any>): Promise<void> {
    const event: JobEvent = {
        type,
        jobId,
        timestamp: new Date().toISOString(),
        data,
    };

    // 1. Memory Fallback (Immediate local delivery)
    const listeners = memoryEmitters.get(jobId);
    if (listeners) {
        listeners.forEach(cb => cb(event));
    }

    // 2. Redis Delivery (Async)
    try {
        const redis = getRedisConnection();
        // Check if redis is actually connected to avoid blocking
        if (redis.status === 'ready' || redis.status === 'connecting') {
            await redis.publish(`job:${jobId}`, JSON.stringify(event));
        }
    } catch (error) {
        // Silently fail Redis - memory fallback already handled local needs
    }
}

/**
 * Subscribe to job events. Returns an unsubscribe function.
 */
export function subscribeToJob(
    jobId: string,
    callback: (event: JobEvent) => void
): () => void {
    // 1. Memory Subscription
    if (!memoryEmitters.has(jobId)) {
        memoryEmitters.set(jobId, new Set());
    }
    memoryEmitters.get(jobId)!.add(callback);

    // 2. Redis Subscription (Attempt)
    let redisUnsubscribe = () => { };
    try {
        const subscriber = getSubscriberConnection();
        const channel = `job:${jobId}`;

        const handler = (_channel: string, message: string) => {
            try {
                const event = JSON.parse(message) as JobEvent;
                // Avoid double-delivery if memory already handled it
                // (Though memory is only for local-process events, Redis is for worker-process events)
                callback(event);
            } catch (error) {
                console.error('[EventEmitter] Failed to parse event:', error);
            }
        };

        if (subscriber.status === 'ready' || subscriber.status === 'connecting') {
            subscriber.subscribe(channel);
            subscriber.on('message', handler);
            redisUnsubscribe = () => {
                subscriber.unsubscribe(channel);
                subscriber.removeListener('message', handler);
            };
        }
    } catch {
        // Ignore redis subscription errors
    }

    // Return union unsubscribe function
    return () => {
        memoryEmitters.get(jobId)?.delete(callback);
        if (memoryEmitters.get(jobId)?.size === 0) {
            memoryEmitters.delete(jobId);
        }
        redisUnsubscribe();
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
