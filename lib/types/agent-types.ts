// Core Types for Multi-Agent System

export type AgentRole =
    | 'planning'
    | 'ux'
    | 'backend'
    | 'frontend'
    | 'database'
    | 'business'
    | 'testing'
    | 'deployment';

export interface AgentCapability {
    prdGeneration: boolean;
    codingDevelopment: boolean;
    testing: boolean;
    deployment: boolean;
}

export interface Agent {
    id: string;
    name: string;
    role: AgentRole;
    capabilities: AgentCapability;
    systemPrompt: string;
    avatar?: string;
    color?: string;
}

export interface AgentResponse {
    agent: AgentRole;
    content: string;
    timestamp: Date;
    phase: 'prd' | 'development' | 'testing' | 'deployment';
    relatedFiles?: string[];
    suggestions?: string[];
}

// PRD State Types
export interface TechnicalRequirements {
    frontend?: string;
    backend?: string;
    database?: string;
    infrastructure?: string;
    integrations?: string[];
}

export interface Timeline {
    phases: {
        name: string;
        duration: string;
        tasks: string[];
    }[];
}

export interface Risk {
    category: string;
    description: string;
    mitigation: string;
    severity: 'low' | 'medium' | 'high';
}

// Project Types
export type ProjectType =
    | 'Full Stack App'
    | 'Mobile App'
    | 'Landing Page'
    | 'Dashboard'
    | 'Chrome Extension';

export interface PRDState {
    projectName: string;
    projectType: ProjectType;
    overview: string;
    objectives: string[];
    userStories: string[];
    technicalRequirements: TechnicalRequirements;
    designConsiderations: string;
    timeline: Timeline;
    risks: Risk[];
    successMetrics: string[];
    constraints: string[];
    dependencies: string[];
}

// Debate & Orchestration Types
export interface DebateRound {
    roundNumber: number;
    topic: string;
    responses: AgentResponse[];
    consensus?: string;
    prdUpdates: Partial<PRDState>;
}

export interface DebateHistory {
    sessionId: string;
    projectTopic: string;
    rounds: DebateRound[];
    finalPRD: PRDState;
    createdAt: Date;
    updatedAt: Date;
}

// Development Phase Types
export interface CodeFile {
    path: string;
    content: string;
    language: string;
    generatedBy: AgentRole;
}

export interface DevelopmentState {
    files: CodeFile[];
    currentPhase: 'planning' | 'implementation' | 'testing' | 'deployment';
    completedTasks: string[];
    pendingTasks: string[];
    issues: {
        id: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        assignedTo: AgentRole;
        status: 'open' | 'in-progress' | 'resolved';
    }[];
}

export interface ProjectState {
    id: string;
    prd: PRDState;
    development: DevelopmentState;
    debateHistory: DebateHistory;
    currentPhase: 'prd-generation' | 'development' | 'testing' | 'deployment';
    createdAt: Date;
    updatedAt: Date;
}

// GitHub Integration Types
export interface GitHubConfig {
    repositoryName: string;
    branch: string;
    autoCommit: boolean;
    autoPR: boolean;
}

export interface CommitInfo {
    message: string;
    files: string[];
    author: AgentRole;
    timestamp: Date;
}

// Jira Integration Types
export interface JiraTask {
    id: string;
    key: string;
    summary: string;
    status: string;
    assignedTo: AgentRole;
}

export interface JiraIntegration {
    projectKey: string;
    tasks: JiraTask[];
}
