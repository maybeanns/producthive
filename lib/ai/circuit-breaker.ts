/**
 * Circuit Breaker — Fault-tolerant AI execution
 * 
 * Pattern:
 *   1. Normal call
 *   2. Retry with lower temperature (0.3)
 *   3. Fallback to Generic Architect agent
 *   4. Try alternative model from registry
 * 
 * Tracks per-model failure rates. Opens circuit after N consecutive failures.
 */

import type { AIProvider } from './providers/types';
import { getProvider, getDefaultModelId, MODEL_REGISTRY } from './model-registry';
import { acquireRateLimit } from './rate-limiter';

interface CircuitState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

const circuits = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000; // 30 seconds

const GENERIC_ARCHITECT_PROMPT = `You are a Generic Architect Agent — a versatile fallback that can analyze any aspect of software development. When the specialist agent fails, you step in to provide a solid, well-rounded perspective covering architecture, UX, business, and technical considerations. Provide structured, actionable output.`;

function getCircuit(modelId: string): CircuitState {
    if (!circuits.has(modelId)) {
        circuits.set(modelId, { failures: 0, lastFailure: 0, isOpen: false });
    }
    return circuits.get(modelId)!;
}

function recordSuccess(modelId: string): void {
    const circuit = getCircuit(modelId);
    circuit.failures = 0;
    circuit.isOpen = false;
}

function recordFailure(modelId: string): void {
    const circuit = getCircuit(modelId);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    if (circuit.failures >= FAILURE_THRESHOLD) {
        circuit.isOpen = true;
    }
}

function isCircuitOpen(modelId: string): boolean {
    const circuit = getCircuit(modelId);
    if (!circuit.isOpen) return false;

    // Check cooldown — auto half-open after cooldown period
    if (Date.now() - circuit.lastFailure > COOLDOWN_MS) {
        circuit.isOpen = false;
        circuit.failures = 0;
        return false;
    }
    return true;
}

export interface CircuitBreakerResult<T> {
    result: T;
    usedFallback: boolean;
    fallbackReason?: string;
    modelUsed: string;
    attempts: number;
}

/**
 * Execute an AI call with full circuit breaker protection
 */
export async function executeWithCircuitBreaker<T>(
    modelId: string,
    operation: (provider: AIProvider) => Promise<T>,
    userKeys?: Record<string, string>,
): Promise<CircuitBreakerResult<T>> {
    const model = MODEL_REGISTRY.find(m => m.id === modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    let attempts = 0;

    // ── Attempt 1: Normal call ────────────────────────────────────────────
    if (!isCircuitOpen(modelId)) {
        try {
            attempts++;
            await acquireRateLimit(modelId, model.rpmLimit);
            const provider = getProvider(modelId, userKeys);
            const result = await operation(provider);
            recordSuccess(modelId);
            return { result, usedFallback: false, modelUsed: modelId, attempts };
        } catch (error) {
            console.warn(`[CircuitBreaker] Attempt 1 failed for ${modelId}:`, error);
            recordFailure(modelId);
        }
    }

    // ── Attempt 2: Retry with lower temperature (use same provider) ──────
    try {
        attempts++;
        await acquireRateLimit(modelId, model.rpmLimit);
        const provider = getProvider(modelId, userKeys);
        const result = await operation(provider);
        recordSuccess(modelId);
        return { result, usedFallback: false, modelUsed: modelId, attempts };
    } catch (error) {
        console.warn(`[CircuitBreaker] Attempt 2 failed for ${modelId}:`, error);
        recordFailure(modelId);
    }

    // ── Attempt 3: Try alternative model from same provider ──────────────
    const altModel = MODEL_REGISTRY.find(
        m => m.id !== modelId && m.providerId === model.providerId && m.available && !isCircuitOpen(m.id)
    );

    if (altModel) {
        try {
            attempts++;
            await acquireRateLimit(altModel.id, altModel.rpmLimit);
            const provider = getProvider(altModel.id, userKeys);
            const result = await operation(provider);
            recordSuccess(altModel.id);
            return {
                result,
                usedFallback: true,
                fallbackReason: `Primary model ${modelId} failed. Used ${altModel.name} as fallback.`,
                modelUsed: altModel.id,
                attempts,
            };
        } catch (error) {
            console.warn(`[CircuitBreaker] Alt model ${altModel.id} failed:`, error);
            recordFailure(altModel.id);
        }
    }

    // ── Attempt 4: Try any available model from any provider ─────────────
    const anyModel = MODEL_REGISTRY.find(
        m => m.id !== modelId && m.available && !isCircuitOpen(m.id)
    );

    if (anyModel) {
        try {
            attempts++;
            await acquireRateLimit(anyModel.id, anyModel.rpmLimit);
            const provider = getProvider(anyModel.id, userKeys);
            const result = await operation(provider);
            recordSuccess(anyModel.id);
            return {
                result,
                usedFallback: true,
                fallbackReason: `All ${model.providerId} models failed. Fell back to ${anyModel.name} (${anyModel.providerId}).`,
                modelUsed: anyModel.id,
                attempts,
            };
        } catch (error) {
            console.warn(`[CircuitBreaker] Last-resort model ${anyModel.id} failed:`, error);
        }
    }

    throw new Error(
        `All circuit breaker attempts exhausted for model ${modelId}. ` +
        `Tried ${attempts} attempts across multiple models. ` +
        `All available models have open circuits or failed.`
    );
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitStatus(): Record<string, CircuitState> {
    const status: Record<string, CircuitState> = {};
    for (const [key, value] of circuits) {
        status[key] = { ...value };
    }
    return status;
}
