/**
 * Zod Schemas for Structured AI Output
 * All LLM responses are validated against these schemas to ensure type safety.
 * Eliminates brittle regex keyword extraction.
 */

import { z } from 'zod';

// ─── Agent Debate Response ───────────────────────────────────────────────────

export const AgentDebateResponseSchema = z.object({
    projectName: z.string().optional(),
    overview: z.string().optional(),
    objectives: z.array(z.string()).optional(),
    userStories: z.array(z.string()).optional(),
    technicalRecommendations: z.object({
        frontend: z.string().optional(),
        backend: z.string().optional(),
        database: z.string().optional(),
        infrastructure: z.string().optional(),
        integrations: z.array(z.string()).optional(),
    }).optional(),
    designConsiderations: z.string().optional(),
    risks: z.array(z.object({
        category: z.string(),
        description: z.string(),
        mitigation: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
    })).optional(),
    successMetrics: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    reasoning: z.string().describe('Explain your reasoning and any agreements/disagreements with other agents'),
    challengesTo: z.array(z.object({
        agentRole: z.string(),
        point: z.string(),
        counterArgument: z.string(),
    })).optional().describe('Challenges to other agents positions'),
    agreementsWith: z.array(z.object({
        agentRole: z.string(),
        point: z.string(),
    })).optional().describe('Points you agree with from other agents'),
});

export type AgentDebateResponse = z.infer<typeof AgentDebateResponseSchema>;

// ─── Consensus PRD Output ────────────────────────────────────────────────────

export const ConsensusPRDSchema = z.object({
    projectName: z.string(),
    projectType: z.string(),
    overview: z.string(),
    objectives: z.array(z.string()),
    userStories: z.array(z.string()),
    technicalRequirements: z.object({
        frontend: z.string().optional(),
        backend: z.string().optional(),
        database: z.string().optional(),
        infrastructure: z.string().optional(),
        integrations: z.array(z.string()).optional(),
    }),
    designConsiderations: z.string(),
    timeline: z.object({
        phases: z.array(z.object({
            name: z.string(),
            duration: z.string(),
            tasks: z.array(z.string()),
        })),
    }),
    risks: z.array(z.object({
        category: z.string(),
        description: z.string(),
        mitigation: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
    })),
    successMetrics: z.array(z.string()),
    constraints: z.array(z.string()),
    dependencies: z.array(z.string()),
    keyDecisions: z.array(z.object({
        decision: z.string(),
        rationale: z.string(),
        supportingAgents: z.array(z.string()),
        dissent: z.string().optional(),
    })).describe('Key decisions made during the debate and why'),
});

export type ConsensusPRD = z.infer<typeof ConsensusPRDSchema>;

// ─── Development Plan ────────────────────────────────────────────────────────

export const DevelopmentPlanSchema = z.object({
    tasks: z.array(z.string()),
    architecture: z.string(),
    techStack: z.record(z.string(), z.string()),
    fileStructure: z.record(z.string(), z.string()),
});

export type DevelopmentPlan = z.infer<typeof DevelopmentPlanSchema>;

// ─── Test Results ────────────────────────────────────────────────────────────

export const TestResultsSchema = z.object({
    issues: z.array(z.string()),
    suggestedTests: z.array(z.string()),
    quality: z.string(),
});

export type TestResults = z.infer<typeof TestResultsSchema>;

// ─── Guardrail Scan Result ───────────────────────────────────────────────────

export const GuardrailScanSchema = z.object({
    safe: z.boolean(),
    severity: z.enum(['none', 'low', 'medium', 'high', 'critical']),
    reason: z.string().optional(),
    threats: z.array(z.object({
        type: z.enum(['prompt_injection', 'pii_leakage', 'malicious_instruction', 'jailbreak', 'other']),
        description: z.string(),
        location: z.string().optional(),
    })).optional(),
    sanitizedInput: z.string(),
});

export type GuardrailScan = z.infer<typeof GuardrailScanSchema>;

// ─── Helper: Convert Zod schema to JSON string for LLM prompts ──────────────

export function schemaToJsonPrompt(schema: z.ZodType): string {
    return JSON.stringify(zodToJsonSchema(schema), null, 2);
}

// Simple Zod-to-JSON-schema converter for LLM prompt inclusion
function zodToJsonSchema(schema: z.ZodType): any {
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties: Record<string, any> = {};
        const required: string[] = [];
        for (const [key, value] of Object.entries(shape)) {
            const zodValue = value as z.ZodType;
            properties[key] = zodToJsonSchema(zodValue);
            if (!(zodValue instanceof z.ZodOptional)) {
                required.push(key);
            }
        }
        return { type: 'object', properties, required: required.length > 0 ? required : undefined };
    }
    if (schema instanceof z.ZodArray) {
        return { type: 'array', items: zodToJsonSchema(schema.element) };
    }
    if (schema instanceof z.ZodString) return { type: 'string' };
    if (schema instanceof z.ZodNumber) return { type: 'number' };
    if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
    if (schema instanceof z.ZodEnum) return { type: 'string', enum: schema.options };
    if (schema instanceof z.ZodOptional) return zodToJsonSchema(schema.unwrap());
    if (schema instanceof z.ZodRecord) return { type: 'object', additionalProperties: zodToJsonSchema(schema.valueSchema) };
    return { type: 'string' };
}
