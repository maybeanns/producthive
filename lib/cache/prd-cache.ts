/**
 * PRD Cache — Redis-backed SHA-256 deduplication cache
 * Serves pre-generated "Base PRDs" for common project types.
 */

import { createHash } from 'crypto';
import { getRedisConnection } from '@/lib/queue/connection';
import type { PRDState } from '@/lib/types/agent-types';

const CACHE_PREFIX = 'prd-cache:';
const CACHE_TTL_SECONDS = 86400; // 24 hours

/**
 * Generate a content hash for cache key
 * Normalizes: lowercase, trim, remove stopwords
 */
function generateCacheKey(topic: string, projectType: string): string {
    const stopwords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with',
        'at', 'by', 'from', 'as', 'into', 'about', 'i', 'me', 'my', 'we', 'our',
        'want', 'need', 'make', 'build', 'create']);

    const normalized = topic
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => !stopwords.has(word))
        .sort()
        .join(' ');

    const input = `${normalized}|${projectType.toLowerCase()}`;
    return CACHE_PREFIX + createHash('sha256').update(input).digest('hex');
}

/**
 * Check cache for an existing PRD
 */
export async function getCachedPRD(topic: string, projectType: string): Promise<PRDState | null> {
    try {
        const redis = getRedisConnection();
        const key = generateCacheKey(topic, projectType);
        const cached = await redis.get(key);

        if (cached) {
            return JSON.parse(cached) as PRDState;
        }
        return null;
    } catch (error) {
        console.warn('[PRDCache] Cache read failed, continuing without cache:', error);
        return null;
    }
}

/**
 * Store a PRD in cache
 */
export async function cachePRD(topic: string, projectType: string, prdState: PRDState): Promise<void> {
    try {
        const redis = getRedisConnection();
        const key = generateCacheKey(topic, projectType);
        await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(prdState));
    } catch (error) {
        console.warn('[PRDCache] Cache write failed:', error);
    }
}

/**
 * Invalidate a cached PRD
 */
export async function invalidatePRDCache(topic: string, projectType: string): Promise<void> {
    try {
        const redis = getRedisConnection();
        const key = generateCacheKey(topic, projectType);
        await redis.del(key);
    } catch (error) {
        console.warn('[PRDCache] Cache invalidation failed:', error);
    }
}
