/**
 * Vertex AI / Gemini Provider
 * Refactored from the old vertex-client.ts into the unified AIProvider interface.
 */

import { ChatVertexAI } from '@langchain/google-vertexai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AIProvider } from './types';

export class VertexProvider implements AIProvider {
    readonly providerId = 'vertex';
    private model: ChatVertexAI;
    private modelName: string;

    constructor(modelName: string) {
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        this.modelName = modelName;
        this.model = new ChatVertexAI({
            model: modelName,
            location,
            temperature: 0.7,
            maxOutputTokens: 8192,
        });
    }

    async generate(prompt: string, systemPrompt?: string): Promise<string> {
        const messages = [];
        if (systemPrompt) messages.push(new SystemMessage(systemPrompt));
        messages.push(new HumanMessage(prompt));

        const response = await this.model.invoke(messages);

        if (typeof response.content === 'string') return response.content;
        if (Array.isArray(response.content)) {
            return response.content.map(c =>
                typeof c === 'string' ? c : JSON.stringify(c)
            ).join('');
        }
        return String(response.content);
    }

    async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown code blocks.`;
        const result = await this.generate(jsonPrompt, systemPrompt);
        const cleaned = result.replace(/```json\s*/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as T;
    }
}
