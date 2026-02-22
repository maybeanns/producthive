/**
 * Anthropic Provider — supports Claude Opus, Sonnet models
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './types';

export class AnthropicProvider implements AIProvider {
    readonly providerId = 'anthropic';
    private client: Anthropic;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.client = new Anthropic({ apiKey });
        this.modelName = modelName;
    }

    async generate(prompt: string, systemPrompt?: string): Promise<string> {
        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: 8192,
            ...(systemPrompt ? { system: systemPrompt } : {}),
            messages: [{ role: 'user', content: prompt }],
        });

        const block = response.content[0];
        return block.type === 'text' ? block.text : JSON.stringify(block);
    }

    async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;

        const result = await this.generate(jsonPrompt, systemPrompt);
        const cleaned = result.replace(/```json\s*/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as T;
    }
}
