/**
 * BullMQ Queue Producers — Enqueue jobs for background processing
 */

import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from './connection';

let prdQueue: Queue | null = null;
let buildQueue: Queue | null = null;

function getPRDQueue(): Queue {
    if (!prdQueue) {
        prdQueue = new Queue('prd-generation', {
            connection: getRedisConnectionOptions(),
            defaultJobOptions: {
                removeOnComplete: { age: 3600 },
                removeOnFail: { age: 86400 },
                attempts: 1,
            },
        });
    }
    return prdQueue;
}

function getBuildQueue(): Queue {
    if (!buildQueue) {
        buildQueue = new Queue('build-pipeline', {
            connection: getRedisConnectionOptions(),
            defaultJobOptions: {
                removeOnComplete: { age: 3600 },
                removeOnFail: { age: 86400 },
                attempts: 1,
            },
        });
    }
    return buildQueue;
}

export interface PRDJobData {
    topic: string;
    projectType: string;
    modelId: string;
    userKeys?: Record<string, string>;
    userId?: string;
    maxRounds?: number;
}

export interface BuildJobData {
    prdState: any;
    modelId: string;
    userKeys?: Record<string, string>;
    userId?: string;
    jiraConfig?: {
        host: string;
        email: string;
        apiToken: string;
        projectKey: string;
    };
    githubConfig?: {
        token: string;
        org: string;
        repoName: string;
    };
}

export interface ContinueJobData {
    jobId: string;
    userInput: string;
    modelId: string;
    userKeys?: Record<string, string>;
    userId?: string;
}

/**
 * Enqueue a new PRD generation job
 */
export async function enqueuePRDJob(data: PRDJobData): Promise<string> {
    const queue = getPRDQueue();
    const job = await queue.add('generate-prd', data, {
        jobId: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    return job.id!;
}

/**
 * Enqueue a build pipeline job
 */
export async function enqueueBuildJob(data: BuildJobData): Promise<string> {
    const queue = getBuildQueue();
    const job = await queue.add('build-software', data, {
        jobId: `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    return job.id!;
}

/**
 * Enqueue a continue debate job
 */
export async function enqueueContinueJob(data: ContinueJobData): Promise<string> {
    const queue = getPRDQueue();
    const job = await queue.add('continue-debate', data, {
        jobId: `continue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    return job.id!;
}

/**
 * In-memory job status tracker for local fallback
 */
const inlineJobs = new Map<string, { status: string; progress: number; result?: any; error?: string }>();

export function updateInlineJob(jobId: string, update: Partial<{ status: string; progress: number; result?: any; error?: string }>) {
    const existing = inlineJobs.get(jobId) || { status: 'active', progress: 0 };
    inlineJobs.set(jobId, { ...existing, ...update });
}

/**
 * Get job status from a queue or inline storage
 */
export async function getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: any;
    error?: string;
} | null> {
    // 1. Check inline jobs first
    if (inlineJobs.has(jobId)) {
        return inlineJobs.get(jobId)!;
    }

    // 2. Fallback to BullMQ
    try {
        const prd = getPRDQueue();
        let job = await prd.getJob(jobId);

        if (!job) {
            const build = getBuildQueue();
            job = await build.getJob(jobId);
        }

        if (!job) return null;

        const state = await job.getState();
        return {
            status: state,
            progress: typeof job.progress === 'number' ? job.progress : 0,
            result: job.returnvalue,
            error: job.failedReason,
        };
    } catch {
        return null;
    }
}
