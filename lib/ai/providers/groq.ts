/**
 * Groq Provider — supports Llama, Qwen, Kimi models
 * Uses the Groq SDK (OpenAI-compatible)
 */

import Groq from 'groq-sdk';
import type { AIProvider } from './types';

export class GroqProvider implements AIProvider {
    readonly providerId = 'groq';
    private client: Groq;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.client = new Groq({ apiKey });
        this.modelName = modelName;
    }

    async generate(prompt: string, systemPrompt?: string): Promise<string> {
        const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await this.client.chat.completions.create({
            model: this.modelName,
            messages,
            temperature: 0.7,
            max_tokens: 8192,
        });

        return response.choices[0]?.message?.content || '';
    }

    async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;

        const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: jsonPrompt });

        const response = await this.client.chat.completions.create({
            model: this.modelName,
            messages,
            temperature: 0.4,
            max_tokens: 8192,
            response_format: { type: 'json_object' },
        });

        const text = response.choices[0]?.message?.content || '{}';
        const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as T;
    }
}
