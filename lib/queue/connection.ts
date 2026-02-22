/**
 * Redis Connection — Provides connection config for BullMQ and raw Redis ops
 * Uses BullMQ's connection options format to avoid ioredis version conflicts.
 */

import IORedis from 'ioredis';

let rawRedis: IORedis | null = null;
let subscriberRedis: IORedis | null = null;

/**
 * Get BullMQ-compatible connection options
 */
export function getRedisConnectionOptions(): { host: string; port: number; maxRetriesPerRequest: null } {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname || 'localhost',
            port: parseInt(parsed.port || '6379', 10),
            maxRetriesPerRequest: null, // Required by BullMQ
        };
    } catch {
        return {
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: null,
        };
    }
}

/**
 * Get a raw ioredis instance for cache, sessions, and pub/sub publish
 */
export function getRedisConnection(): IORedis {
    if (!rawRedis) {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        rawRedis = new IORedis(url, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy(times) {
                return Math.min(times * 200, 5000);
            },
        });

        rawRedis.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
        });

        rawRedis.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });
    }
    return rawRedis;
}

/**
 * Get a separate Redis connection for Pub/Sub subscriber
 */
export function getSubscriberConnection(): IORedis {
    if (!subscriberRedis) {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        subscriberRedis = new IORedis(url, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
    }
    return subscriberRedis;
}

/**
 * Gracefully close all Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
    if (rawRedis) {
        await rawRedis.quit();
        rawRedis = null;
    }
    if (subscriberRedis) {
        await subscriberRedis.quit();
        subscriberRedis = null;
    }
}
