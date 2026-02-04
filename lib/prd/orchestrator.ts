/**
 * PRD Orchestrator - Manages multi-agent debate for PRD generation
 */

import type {
    Agent,
    AgentResponse,
    PRDState,
    DebateRound,
    DebateHistory,
} from '@/lib/types/agent-types';
import { prdAgents } from '@/lib/agents/agent-config';
import { getVertexAIClient } from '@/lib/ai/vertex-client';

export class PRDOrchestrator {
    private agents: Agent[];
    private debateHistory: DebateRound[];
    private prdState: PRDState;
    private currentRound: number;
    private projectTopic: string;

    constructor() {
        this.agents = prdAgents;
        this.debateHistory = [];
        this.currentRound = 0;
        this.projectTopic = '';
        this.prdState = this.initializePRDState();
    }

    /**
     * Initialize empty PRD state
     */
    private initializePRDState(projectType: any = 'Full Stack App'): PRDState {
        return {
            projectName: '',
            projectType,
            overview: '',
            objectives: [],
            userStories: [],
            technicalRequirements: {},
            designConsiderations: '',
            timeline: { phases: [] },
            risks: [],
            successMetrics: [],
            constraints: [],
            dependencies: [],
        };
    }

    /**
     * Start PRD generation debate
     */
    async startDebate(topic: string, projectType: string = 'Full Stack App'): Promise<{
        debateRound: DebateRound;
        prdState: PRDState;
    }> {
        this.projectTopic = topic;
        this.currentRound = 1;
        this.prdState = this.initializePRDState(projectType);
        this.debateHistory = [];

        const round = await this.runRound(
            `Analyze this project idea and provide your perspective: "${topic}"\n\nProject Type: ${projectType}\n\nReview the specific requirements and constraints for a ${projectType}.`
        );

        return {
            debateRound: round,
            prdState: this.prdState,
        };
    }

    /**
     * Continue debate with additional context or questions
     */
    async continueDebate(userMessage?: string): Promise<{
        debateRound: DebateRound;
        prdState: PRDState;
    }> {
        this.currentRound++;

        const previousResponses = this.debateHistory
            .flatMap(r => r.responses)
            .slice(-6) // Last 6 responses for context
            .map(r => `${r.agent}: ${r.content.substring(0, 200)}...`)
            .join('\n\n');

        const prompt = userMessage
            ? `User feedback: "${userMessage}"\n\nPrevious discussion:\n${previousResponses}\n\nProvide your updated perspective.`
            : `Based on the previous discussion:\n${previousResponses}\n\nProvide additional insights or refinements.`;

        const round = await this.runRound(prompt);

        return {
            debateRound: round,
            prdState: this.prdState,
        };
    }

    /**
     * Run a single debate round with all agents
     */
    private async runRound(prompt: string): Promise<DebateRound> {
        const responses: AgentResponse[] = [];

        // Get response from each agent
        for (const agent of this.agents) {
            const response = await this.getAgentResponse(agent, prompt);
            responses.push(response);

            // Update PRD state from this response
            this.updatePRDFromResponse(response);
        }

        const round: DebateRound = {
            roundNumber: this.currentRound,
            topic: prompt,
            responses,
            prdUpdates: { ...this.prdState },
        };

        this.debateHistory.push(round);

        return round;
    }

    /**
     * Get response from a single agent
     */
    private async getAgentResponse(agent: Agent, prompt: string): Promise<AgentResponse> {
        const client = getVertexAIClient();

        const fullPrompt = `Project: ${this.projectTopic}

Current PRD State:
${JSON.stringify(this.prdState, null, 2)}

${prompt}

Provide your perspective as the ${agent.name} focusing on your area of expertise.`;

        try {
            const content = await client.generate(fullPrompt, agent.systemPrompt);

            return {
                agent: agent.role,
                content,
                timestamp: new Date(),
                phase: 'prd',
            };
        } catch (error) {
            console.error(`Error getting response from ${agent.name}:`, error);
            return {
                agent: agent.role,
                content: `Error: Unable to generate response. ${error}`,
                timestamp: new Date(),
                phase: 'prd',
            };
        }
    }

    /**
     * Update PRD state from agent response
     */
    private updatePRDFromResponse(response: AgentResponse): void {
        const content = response.content.toLowerCase();

        // Simple keyword-based extraction (can be enhanced with structured output)

        // Extract objectives
        if (content.includes('objective') || content.includes('goal')) {
            const objectiveMatch = response.content.match(/(?:objective|goal)[s]?:?\s*([^\n]+)/gi);
            if (objectiveMatch) {
                objectiveMatch.forEach(match => {
                    const objective = match.replace(/(?:objective|goal)[s]?:?\s*/i, '').trim();
                    if (objective && !this.prdState.objectives.includes(objective)) {
                        this.prdState.objectives.push(objective);
                    }
                });
            }
        }

        // Extract user stories
        if (content.includes('user story') || content.includes('as a')) {
            const storyMatch = response.content.match(/(?:user story|as a)[^.]*[.]/gi);
            if (storyMatch) {
                storyMatch.forEach(story => {
                    if (!this.prdState.userStories.includes(story)) {
                        this.prdState.userStories.push(story);
                    }
                });
            }
        }

        // Agent-specific extractions
        switch (response.agent) {
            case 'planning':
                // Extract project name if not set
                if (!this.prdState.projectName && this.projectTopic) {
                    this.prdState.projectName = this.projectTopic;
                }
                break;

            case 'ux':
                // UX considerations go to design section
                if (content.includes('design') || content.includes('ui') || content.includes('ux')) {
                    this.prdState.designConsiderations += '\n' + response.content;
                }
                break;

            case 'backend':
            case 'frontend':
            case 'database':
                // Technical requirements
                if (response.agent === 'backend' && content.includes('api')) {
                    this.prdState.technicalRequirements.backend = response.content;
                }
                if (response.agent === 'frontend') {
                    this.prdState.technicalRequirements.frontend = response.content;
                }
                if (response.agent === 'database') {
                    this.prdState.technicalRequirements.database = response.content;
                }
                break;

            case 'business':
                // Business risks and metrics
                if (content.includes('risk')) {
                    // Extract risks (simplified)
                    this.prdState.risks.push({
                        category: 'business',
                        description: response.content.substring(0, 200),
                        mitigation: 'TBD',
                        severity: 'medium',
                    });
                }
                break;
        }
    }

    /**
     * Get current PRD state
     */
    getPRDState(): PRDState {
        return { ...this.prdState };
    }

    /**
     * Get debate history
     */
    getDebateHistory(): DebateHistory {
        return {
            sessionId: `session-${Date.now()}`,
            projectTopic: this.projectTopic,
            rounds: this.debateHistory,
            finalPRD: this.prdState,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    /**
     * Get count of filled PRD sections
     */
    getFilledSectionsCount(): number {
        let count = 0;
        if (this.prdState.projectName) count++;
        if (this.prdState.overview) count++;
        if (this.prdState.objectives.length > 0) count++;
        if (this.prdState.userStories.length > 0) count++;
        if (Object.keys(this.prdState.technicalRequirements).length > 0) count++;
        if (this.prdState.designConsiderations) count++;
        if (this.prdState.timeline.phases.length > 0) count++;
        if (this.prdState.risks.length > 0) count++;
        if (this.prdState.successMetrics.length > 0) count++;
        return count;
    }
}
