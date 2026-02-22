/**
 * Rate Limiter — Token-bucket per-model rate limiting
 * Prevents hitting provider RPM/TPM limits across all users.
 * Uses in-memory for simplicity; production can swap to Redis-backed.
 */

interface RateBucket {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

const buckets = new Map<string, RateBucket>();

/**
 * Initialize a rate bucket for a model
 */
function getBucket(modelId: string, rpmLimit: number): RateBucket {
    if (!buckets.has(modelId)) {
        buckets.set(modelId, {
            tokens: rpmLimit,
            lastRefill: Date.now(),
            maxTokens: rpmLimit,
            refillRate: rpmLimit / 60, // tokens per second
        });
    }
    return buckets.get(modelId)!;
}

/**
 * Refill tokens based on elapsed time
 */
function refill(bucket: RateBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const newTokens = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + newTokens);
    bucket.lastRefill = now;
}

/**
 * Wait until a request can proceed (backpressure, not reject)
 */
export async function acquireRateLimit(modelId: string, rpmLimit: number): Promise<void> {
    const bucket = getBucket(modelId, rpmLimit);

    // Try up to 60 seconds (shouldn't need that long)
    for (let attempt = 0; attempt < 60; attempt++) {
        refill(bucket);

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return;
        }

        // Wait 1 second and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Rate limit exceeded for model ${modelId} after 60s backpressure wait.`);
}

/**
 * Get current rate limit status for a model
 */
export function getRateLimitStatus(modelId: string): { available: number; max: number } | null {
    const bucket = buckets.get(modelId);
    if (!bucket) return null;
    refill(bucket);
    return { available: Math.floor(bucket.tokens), max: bucket.maxTokens };
}
