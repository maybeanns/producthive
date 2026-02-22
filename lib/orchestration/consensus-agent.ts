/**
 * Consensus Agent — Synthesizes the final PRD from the complete debate transcript
 * 
 * Resolves conflicts, produces structured output, and explains key decisions.
 */

import type { PRDState } from '@/lib/types/agent-types';
import type { AIProvider } from '@/lib/ai/providers/types';
import type { ConsensusPRD } from '@/lib/ai/schemas';
import { ConsensusPRDSchema, schemaToJsonPrompt } from '@/lib/ai/schemas';
import { executeWithCircuitBreaker } from '@/lib/ai/circuit-breaker';
import type { DebateTranscriptEntry } from './debate-engine';

export interface ConsensusResult {
    prdState: PRDState;
    keyDecisions: {
        decision: string;
        rationale: string;
        supportingAgents: string[];
        dissent?: string;
    }[];
    modelUsed: string;
}

/**
 * Synthesize a final PRD from the debate transcript
 */
export async function synthesizeConsensus(
    transcript: DebateTranscriptEntry[],
    projectTopic: string,
    projectType: string,
    modelId: string,
    userKeys?: Record<string, string>,
): Promise<ConsensusResult> {
    // Format the full debate for the consensus agent
    const debateText = transcript.map(entry => {
        const parts = [
            `[Round ${entry.round}] ${entry.agent.name} (${entry.agent.role}):`,
            entry.response.reasoning,
        ];

        if (entry.response.objectives?.length) {
            parts.push(`Proposed objectives: ${entry.response.objectives.join('; ')}`);
        }
        if (entry.response.userStories?.length) {
            parts.push(`User stories: ${entry.response.userStories.join('; ')}`);
        }
        if (entry.response.technicalRecommendations) {
            parts.push(`Tech recommendations: ${JSON.stringify(entry.response.technicalRecommendations)}`);
        }
        if (entry.response.risks?.length) {
            parts.push(`Identified risks: ${entry.response.risks.map(r => `${r.category}: ${r.description}`).join('; ')}`);
        }
        if (entry.response.challengesTo?.length) {
            entry.response.challengesTo.forEach(c => {
                parts.push(`CHALLENGE to ${c.agentRole}: "${c.point}" → ${c.counterArgument}`);
            });
        }
        if (entry.response.agreementsWith?.length) {
            entry.response.agreementsWith.forEach(a => {
                parts.push(`AGREES with ${a.agentRole}: ${a.point}`);
            });
        }

        return parts.join('\n');
    }).join('\n\n---\n\n');

    const schema = schemaToJsonPrompt(ConsensusPRDSchema);

    const prompt = `You are the Consensus Agent. Your job is to synthesize the FINAL Product Requirements Document from the complete multi-agent debate below.

PROJECT: "${projectTopic}"
TYPE: ${projectType}

=== COMPLETE DEBATE TRANSCRIPT ===
${debateText}
=== END TRANSCRIPT ===

INSTRUCTIONS:
1. Read the entire debate carefully
2. Identify points of agreement and disagreement
3. Resolve conflicts using majority consensus + strongest argument
4. When agents disagree, explain WHY you chose one position over another in keyDecisions
5. Produce a COMPLETE, PRODUCTION-READY PRD that incorporates the best ideas from all agents
6. Include specific timeline phases with realistic durations
7. List concrete success metrics
8. Be thorough — this PRD will be used to generate actual software

Respond with valid JSON matching this schema:
${schema}

Return ONLY the JSON. No markdown, no code blocks.`;

    const systemPrompt = `You are an expert Product Manager and Technical Lead who synthesizes multi-stakeholder debates into clear, actionable PRDs. You are impartial, data-driven, and always explain your reasoning when resolving disagreements.`;

    const circuitResult = await executeWithCircuitBreaker(
        modelId,
        async (provider: AIProvider) => {
            return await provider.generateJSON<ConsensusPRD>(prompt, systemPrompt);
        },
        userKeys,
    );

    // Validate
    let consensus: ConsensusPRD;
    try {
        consensus = ConsensusPRDSchema.parse(circuitResult.result);
    } catch (validationError) {
        // Attempt to use the raw result with fallback defaults
        const raw = circuitResult.result as any;
        consensus = {
            projectName: raw.projectName || projectTopic,
            projectType: raw.projectType || projectType,
            overview: raw.overview || '',
            objectives: raw.objectives || [],
            userStories: raw.userStories || [],
            technicalRequirements: raw.technicalRequirements || {},
            designConsiderations: raw.designConsiderations || '',
            timeline: raw.timeline || { phases: [] },
            risks: raw.risks || [],
            successMetrics: raw.successMetrics || [],
            constraints: raw.constraints || [],
            dependencies: raw.dependencies || [],
            keyDecisions: raw.keyDecisions || [],
        };
    }

    // Convert to PRDState
    const prdState: PRDState = {
        projectName: consensus.projectName,
        projectType: (consensus.projectType as any) || 'Full Stack App',
        overview: consensus.overview,
        objectives: consensus.objectives,
        userStories: consensus.userStories,
        technicalRequirements: consensus.technicalRequirements,
        designConsiderations: consensus.designConsiderations,
        timeline: consensus.timeline,
        risks: consensus.risks,
        successMetrics: consensus.successMetrics,
        constraints: consensus.constraints,
        dependencies: consensus.dependencies,
    };

    return {
        prdState,
        keyDecisions: consensus.keyDecisions,
        modelUsed: circuitResult.modelUsed,
    };
}
