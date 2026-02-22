/**
 * Model Registry — Central registry of all AI models across all providers
 * Handles model lookup, provider instantiation, and API key resolution.
 */

import type { AIProvider, ModelDefinition } from './providers/types';
import { GroqProvider } from './providers/groq';
import { VertexProvider } from './providers/vertex';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';

// ─── Model Definitions ──────────────────────────────────────────────────────

export const MODEL_REGISTRY: ModelDefinition[] = [
    // Groq-hosted models
    {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        providerId: 'groq',
        modelApiName: 'llama-3.3-70b-versatile',
        contextWindow: 128_000,
        costTier: 'free',
        capabilities: { structuredOutput: true, multimodal: false, streaming: true },
        rpmLimit: 30,
        tpmLimit: 6000,
        available: true,
    },
    {
        id: 'qwen3-32b',
        name: 'Qwen3 32B',
        providerId: 'groq',
        modelApiName: 'qwen/qwen3-32b',
        contextWindow: 128_000,
        costTier: 'free',
        capabilities: { structuredOutput: true, multimodal: false, streaming: true },
        rpmLimit: 30,
        tpmLimit: 6000,
        available: true,
    },
    {
        id: 'kimi-k2',
        name: 'Kimi K2 Instruct',
        providerId: 'groq',
        modelApiName: 'moonshotai/kimi-k2-instruct-0905',
        contextWindow: 128_000,
        costTier: 'free',
        capabilities: { structuredOutput: true, multimodal: false, streaming: true },
        rpmLimit: 30,
        tpmLimit: 6000,
        available: true,
    },
    // Google Vertex AI / Gemini
    {
        id: 'gemini-flash',
        name: 'Gemini 3 Flash',
        providerId: 'vertex',
        modelApiName: 'gemini-2.0-flash',
        contextWindow: 1_048_576,
        costTier: 'low',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 60,
        tpmLimit: 32_000,
        available: true,
    },
    {
        id: 'gemini-pro-high',
        name: 'Gemini 3.1 (High)',
        providerId: 'vertex',
        modelApiName: 'gemini-2.5-pro-preview-06-05',
        contextWindow: 1_048_576,
        costTier: 'high',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 30,
        tpmLimit: 32_000,
        available: true,
    },
    {
        id: 'gemini-pro-low',
        name: 'Gemini 3.1 (Low)',
        providerId: 'vertex',
        modelApiName: 'gemini-2.5-flash-preview-05-20',
        contextWindow: 1_048_576,
        costTier: 'low',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 60,
        tpmLimit: 32_000,
        available: true,
    },
    // OpenAI
    {
        id: 'gpt-5.2',
        name: 'GPT 5.2',
        providerId: 'openai',
        modelApiName: 'gpt-4o',
        contextWindow: 128_000,
        costTier: 'high',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 60,
        tpmLimit: 30_000,
        available: true,
    },
    {
        id: 'gpt-oss-120b',
        name: 'GPT-OSS 120B',
        providerId: 'openai',
        modelApiName: 'gpt-4o-mini',
        contextWindow: 128_000,
        costTier: 'medium',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 60,
        tpmLimit: 30_000,
        available: true,
    },
    // Anthropic
    {
        id: 'claude-opus',
        name: 'Anthropic 4.6 Opus',
        providerId: 'anthropic',
        modelApiName: 'claude-sonnet-4-20250514',
        contextWindow: 200_000,
        costTier: 'high',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 50,
        tpmLimit: 40_000,
        available: true,
    },
    {
        id: 'claude-sonnet',
        name: 'Anthropic 4.6 Sonnet',
        providerId: 'anthropic',
        modelApiName: 'claude-sonnet-4-20250514',
        contextWindow: 200_000,
        costTier: 'medium',
        capabilities: { structuredOutput: true, multimodal: true, streaming: true },
        rpmLimit: 50,
        tpmLimit: 40_000,
        available: true,
    },
];

// ─── Provider Cache ──────────────────────────────────────────────────────────

const providerCache = new Map<string, AIProvider>();

/**
 * Get all available models for display in the UI
 */
export function getAvailableModels(): ModelDefinition[] {
    return MODEL_REGISTRY.filter(m => m.available);
}

/**
 * Get model definition by ID
 */
export function getModelDefinition(modelId: string): ModelDefinition | undefined {
    return MODEL_REGISTRY.find(m => m.id === modelId);
}

/**
 * Resolve API key for a provider. Checks: user-provided key → env key
 */
function resolveApiKey(providerId: string, userKeys?: Record<string, string>): string | undefined {
    // User-provided keys take priority
    if (userKeys?.[providerId]) return userKeys[providerId];

    switch (providerId) {
        case 'groq': return process.env.GROQ_API_KEY;
        case 'openai': return process.env.OPENAI_API_KEY;
        case 'anthropic': return process.env.ANTHROPIC_API_KEY;
        case 'vertex': return 'vertex-uses-service-account'; // Uses GOOGLE_APPLICATION_CREDENTIALS
        default: return undefined;
    }
}

/**
 * Create an AI provider instance for a specific model
 */
export function getProvider(
    modelId: string,
    userKeys?: Record<string, string>
): AIProvider {
    const cacheKey = `${modelId}-${JSON.stringify(userKeys || {})}`;
    if (providerCache.has(cacheKey)) {
        return providerCache.get(cacheKey)!;
    }

    const model = getModelDefinition(modelId);
    if (!model) {
        throw new Error(`Model not found: ${modelId}. Available: ${MODEL_REGISTRY.map(m => m.id).join(', ')}`);
    }

    const apiKey = resolveApiKey(model.providerId, userKeys);

    let provider: AIProvider;

    switch (model.providerId) {
        case 'groq':
            if (!apiKey) throw new Error('Groq API key required. Set GROQ_API_KEY or provide in settings.');
            provider = new GroqProvider(apiKey, model.modelApiName);
            break;

        case 'vertex':
            provider = new VertexProvider(model.modelApiName);
            break;

        case 'openai':
            if (!apiKey) throw new Error('OpenAI API key required. Provide in settings.');
            provider = new OpenAIProvider(apiKey, model.modelApiName);
            break;

        case 'anthropic':
            if (!apiKey) throw new Error('Anthropic API key required. Provide in settings.');
            provider = new AnthropicProvider(apiKey, model.modelApiName);
            break;

        default:
            throw new Error(`Unknown provider: ${model.providerId}`);
    }

    providerCache.set(cacheKey, provider);
    return provider;
}

/**
 * Get the default model ID (first available free model)
 */
export function getDefaultModelId(): string {
    const freeModel = MODEL_REGISTRY.find(m => m.available && m.costTier === 'free');
    return freeModel?.id || MODEL_REGISTRY[0].id;
}
