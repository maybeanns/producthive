/**
 * Sequential Multi-Round Debate Engine
 * 
 * Agents debate sequentially — each agent hears the full transcript of all
 * previous agents before speaking, creating a real debate where agents
 * challenge, agree, and build on each other's positions.
 * 
 * Multiple rounds allow agents to refine their positions.
 * A Consensus Agent synthesizes the final PRD from the complete debate.
 */

import type { Agent, AgentRole } from '@/lib/types/agent-types';
import type { AIProvider } from '@/lib/ai/providers/types';
import type { AgentDebateResponse } from '@/lib/ai/schemas';
import { AgentDebateResponseSchema, schemaToJsonPrompt } from '@/lib/ai/schemas';
import { executeWithCircuitBreaker } from '@/lib/ai/circuit-breaker';
import { getModelDefinition } from '@/lib/ai/model-registry';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DebateTranscriptEntry {
    round: number;
    agent: Agent;
    response: AgentDebateResponse;
    rawText: string;
    modelUsed: string;
    usedFallback: boolean;
    fallbackReason?: string;
    timestamp: Date;
}

export interface DebateConfig {
    maxRounds: number;          // Default: 3, Max: 5
    modelId: string;            // Model to use for all agents
    userKeys?: Record<string, string>;
    onAgentThinking?: (agent: Agent, round: number) => void;
    onAgentResponse?: (entry: DebateTranscriptEntry) => void;
    onRoundComplete?: (round: number, transcript: DebateTranscriptEntry[]) => void;
}

export interface DebateResult {
    transcript: DebateTranscriptEntry[];
    totalRounds: number;
    converged: boolean;
}

// ─── Debate Engine ──────────────────────────────────────────────────────────

export class DebateEngine {
    private transcript: DebateTranscriptEntry[] = [];
    private projectTopic: string;
    private projectType: string;
    private config: DebateConfig;

    constructor(
        projectTopic: string,
        projectType: string,
        config: DebateConfig
    ) {
        this.projectTopic = projectTopic;
        this.projectType = projectType;
        const { maxRounds: inputRounds, ...restConfig } = config;
        this.config = {
            ...restConfig,
            maxRounds: Math.min(inputRounds || 3, 5),
        };
    }

    /**
     * Run the full multi-round debate
     */
    async runDebate(agents: Agent[]): Promise<DebateResult> {
        const maxRounds = this.config.maxRounds;
        let converged = false;

        for (let round = 1; round <= maxRounds; round++) {
            const roundEntries: DebateTranscriptEntry[] = [];

            // Each agent speaks sequentially, seeing the full transcript
            for (const agent of agents) {
                // Emit "thinking" event
                this.config.onAgentThinking?.(agent, round);

                const entry = await this.getAgentDebateResponse(agent, round);
                this.transcript.push(entry);
                roundEntries.push(entry);

                // Emit "response" event
                this.config.onAgentResponse?.(entry);
            }

            // Emit round complete
            this.config.onRoundComplete?.(round, roundEntries);

            // Check convergence after round 2+
            if (round >= 2) {
                converged = this.checkConvergence(roundEntries);
                if (converged) {
                    break;
                }
            }
        }

        return {
            transcript: this.transcript,
            totalRounds: Math.ceil(this.transcript.length / agents.length) || 1,
            converged,
        };
    }

    /**
     * Get a single agent's debate response with full context
     */
    private async getAgentDebateResponse(
        agent: Agent,
        round: number
    ): Promise<DebateTranscriptEntry> {
        const transcriptContext = this.formatTranscriptForAgent(agent.role, round);

        const prompt = this.buildAgentPrompt(agent, round, transcriptContext);

        const schemaHint = schemaToJsonPrompt(AgentDebateResponseSchema);

        const fullPrompt = `${prompt}

You MUST respond with valid JSON matching this schema:
${schemaHint}

Return ONLY the JSON object. No markdown, no code blocks, no explanation outside the JSON.`;

        const circuitResult = await executeWithCircuitBreaker(
            this.config.modelId,
            async (provider: AIProvider) => {
                return await provider.generateJSON<AgentDebateResponse>(fullPrompt, agent.systemPrompt);
            },
            this.config.userKeys,
        );

        // Validate with Zod
        let parsed: AgentDebateResponse;
        try {
            parsed = AgentDebateResponseSchema.parse(circuitResult.result);
        } catch {
            // If validation fails, wrap the raw result with required field
            parsed = {
                reasoning: typeof circuitResult.result === 'string'
                    ? circuitResult.result
                    : JSON.stringify(circuitResult.result),
            };
        }

        return {
            round,
            agent,
            response: parsed,
            rawText: parsed.reasoning,
            modelUsed: circuitResult.modelUsed,
            usedFallback: circuitResult.usedFallback,
            fallbackReason: circuitResult.fallbackReason,
            timestamp: new Date(),
        };
    }

    /**
     * Build prompt with full debate context for an agent
     */
    private buildAgentPrompt(agent: Agent, round: number, transcriptContext: string): string {
        if (round === 1 && this.transcript.length === 0) {
            // First agent in first round — no prior context
            return `PROJECT TOPIC: "${this.projectTopic}"
PROJECT TYPE: ${this.projectType}

You are the FIRST agent to speak in this product debate. Analyze the project idea and share your expert perspective as the ${agent.name}.

Focus on your area of expertise. Be specific and actionable.`;
        }

        return `PROJECT TOPIC: "${this.projectTopic}"
PROJECT TYPE: ${this.projectType}

DEBATE ROUND: ${round}

=== DEBATE TRANSCRIPT SO FAR ===
${transcriptContext}
=== END TRANSCRIPT ===

You are the ${agent.name}. You have read the entire debate transcript above.

${round === 1
                ? `This is Round 1. Review what previous agents have said and provide your perspective. You may agree, disagree, or build on their points.`
                : `This is Round ${round}. Review the full debate including previous rounds. Refine your position based on what you've learned from other agents. Challenge ideas you disagree with. Strengthen ideas you support. Focus on reaching consensus.`
            }

Be specific. Reference other agents by role when agreeing or disagreeing.`;
    }

    /**
     * Format the full transcript for an agent to read
     */
    private formatTranscriptForAgent(currentRole: AgentRole, currentRound: number): string {
        if (this.transcript.length === 0) return '(No prior discussion)';

        return this.transcript.map(entry => {
            const parts = [
                `[Round ${entry.round}] ${entry.agent.name} (${entry.agent.role}):`,
                `Reasoning: ${entry.response.reasoning}`,
            ];

            if (entry.response.objectives?.length) {
                parts.push(`Objectives: ${entry.response.objectives.join(', ')}`);
            }
            if (entry.response.technicalRecommendations) {
                const tech = entry.response.technicalRecommendations;
                const techParts = [];
                if (tech.frontend) techParts.push(`Frontend: ${tech.frontend}`);
                if (tech.backend) techParts.push(`Backend: ${tech.backend}`);
                if (tech.database) techParts.push(`Database: ${tech.database}`);
                if (techParts.length) parts.push(`Tech: ${techParts.join(' | ')}`);
            }
            if (entry.response.challengesTo?.length) {
                entry.response.challengesTo.forEach(c => {
                    parts.push(`⚡ Challenges ${c.agentRole}: "${c.point}" → ${c.counterArgument}`);
                });
            }
            if (entry.response.agreementsWith?.length) {
                entry.response.agreementsWith.forEach(a => {
                    parts.push(`✓ Agrees with ${a.agentRole}: ${a.point}`);
                });
            }

            return parts.join('\n');
        }).join('\n\n---\n\n');
    }

    /**
     * Check if the debate has converged (agents stop introducing new ideas)
     */
    private checkConvergence(latestRound: DebateTranscriptEntry[]): boolean {
        // If no challenges in the latest round, consider it converged
        const newChallenges = latestRound.reduce((count, entry) => {
            return count + (entry.response.challengesTo?.length || 0);
        }, 0);

        // If fewer than 2 new challenges across all agents, we've converged
        return newChallenges < 2;
    }

    /**
     * Get the full transcript
     */
    getTranscript(): DebateTranscriptEntry[] {
        return [...this.transcript];
    }
}
