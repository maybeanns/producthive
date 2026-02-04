/**
 * Shared orchestrator storage
 * In production, replace this with Redis, database, or other persistent storage
 */

import { PRDOrchestrator } from '@/lib/prd/orchestrator';
import { DevelopmentOrchestrator } from '@/lib/development/orchestrator';

// Store PRD orchestrator instances per session
const prdOrchestrators = new Map<string, PRDOrchestrator>();

// Store Development orchestrator instances per session
const devOrchestrators = new Map<string, DevelopmentOrchestrator>();

// PRD Orchestrator accessors
export function getPRDOrchestrator(sessionId: string): PRDOrchestrator | undefined {
    return prdOrchestrators.get(sessionId);
}

export function setPRDOrchestrator(sessionId: string, orchestrator: PRDOrchestrator): void {
    prdOrchestrators.set(sessionId, orchestrator);
}

export function deletePRDOrchestrator(sessionId: string): boolean {
    return prdOrchestrators.delete(sessionId);
}

// Development Orchestrator accessors
export function getDevOrchestrator(sessionId: string): DevelopmentOrchestrator | undefined {
    return devOrchestrators.get(sessionId);
}

export function setDevOrchestrator(sessionId: string, orchestrator: DevelopmentOrchestrator): void {
    devOrchestrators.set(sessionId, orchestrator);
}

export function deleteDevOrchestrator(sessionId: string): boolean {
    return devOrchestrators.delete(sessionId);
}
