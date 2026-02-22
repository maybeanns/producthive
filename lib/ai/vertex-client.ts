/**
 * Vertex AI Client for Google Cloud AI Platform
 * Handles communication with Gemini models via Vertex AI SDK
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export interface VertexAIConfig {
    project: string;
    location: string;
    model?: string;
}

interface Message {
    role: string;
    content: string;
}

export class VertexAIClient {
    private model: ChatVertexAI;
    private project: string;
    private location: string;

    constructor(config: VertexAIConfig) {
        const { project, location, model = 'gemini-1.5-pro' } = config;
        this.project = project;
        this.location = location;

        // Initialize LangChain VertexAI model
        // Credentials are automatically loaded from GOOGLE_APPLICATION_CREDENTIALS env var
        this.model = new ChatVertexAI({
            model: model,
            location: location,
            temperature: 0.7,
            maxOutputTokens: 8192,
        });
    }

    /**
     * Generate content from a prompt
     */
    async generate(prompt: string, systemInstruction?: string): Promise<string> {
        try {
            const messages = [];

            if (systemInstruction) {
                messages.push(new SystemMessage(systemInstruction));
            }

            messages.push(new HumanMessage(prompt));

            const response = await this.model.invoke(messages);

            // Handle content type (string or array of content parts)
            if (typeof response.content === 'string') {
                return response.content;
            } else if (Array.isArray(response.content)) {
                return response.content.map(c =>
                    typeof c === 'string' ? c : JSON.stringify(c)
                ).join('');
            }

            return String(response.content);
        } catch (error) {
            console.error('Vertex AI generation error:', error);
            throw new Error(`Failed to generate content: ${error}`);
        }
    }

    /**
     * Generate content with conversation history
     */
    async chat(messages: Message[], systemInstruction?: string): Promise<string> {
        try {
            const langchainMessages = [];

            if (systemInstruction) {
                langchainMessages.push(new SystemMessage(systemInstruction));
            }

            for (const msg of messages) {
                if (msg.role === 'user') {
                    langchainMessages.push(new HumanMessage(msg.content));
                } else if (msg.role === 'model' || msg.role === 'assistant') {
                    langchainMessages.push(new SystemMessage(msg.content)); // Using SystemMessage for assistant context or AIMessage if imported
                }
            }

            const response = await this.model.invoke(langchainMessages);
            if (typeof response.content === 'string') {
                return response.content;
            }
            return String(response.content);
        } catch (error) {
            console.error('Vertex AI chat error:', error);
            throw new Error(`Failed to chat: ${error}`);
        }
    }

    /**
     * Generate structured JSON output
     * Note: Full structured output enforcement depends on model capability.
     * For now, we prompt for JSON.
     */
    async generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON properly formatted. Do not include markdown code blocks like \`\`\`json.`;

        try {
            const result = await this.generate(jsonPrompt, systemInstruction);
            // Clean up if markdown blocks are included despite instructions
            const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanResult) as T;
        } catch (error) {
            console.error('Vertex AI JSON generation error:', error);
            throw error;
        }
    }
}

// Singleton instance
let vertexClient: VertexAIClient | null = null;

/**
 * Get or create Vertex AI client instance
 */
export function getVertexAIClient(): VertexAIClient {
    if (!vertexClient) {
        const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        const model = process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro';

        if (!project) {
            console.warn('GOOGLE_CLOUD_PROJECT_ID is not set in environment variables.');
        }

        vertexClient = new VertexAIClient({
            project: project || 'undefined-project',
            location,
            model
        });
    }

    return vertexClient;
}
