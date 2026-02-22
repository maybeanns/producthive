/**
 * AI Provider Interface
 * All model providers (Groq, Vertex, OpenAI, Anthropic) implement this interface.
 */

export interface AIProvider {
    readonly providerId: string;

    /**
     * Generate text from a prompt
     */
    generate(prompt: string, systemPrompt?: string): Promise<string>;

    /**
     * Generate structured JSON output validated against expectations
     */
    generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
}

export interface ModelDefinition {
    id: string;
    name: string;              // User-facing display name
    providerId: string;        // Which provider handles this model
    modelApiName: string;      // Actual API model name to send to provider
    contextWindow: number;     // Max tokens
    costTier: 'free' | 'low' | 'medium' | 'high';
    capabilities: {
        structuredOutput: boolean;
        multimodal: boolean;
        streaming: boolean;
    };
    rpmLimit: number;          // Requests per minute
    tpmLimit: number;          // Tokens per minute
    available: boolean;        // Whether model is currently available
}
