/**
 * PRD Start — V2 Async
 * POST /api/prd/start → 202 Accepted + { jobId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { enqueuePRDJob } from '@/lib/queue/producers';
import { getDefaultModelId } from '@/lib/ai/model-registry';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, projectType, modelId, userKeys, maxRounds } = body;

        if (!topic) {
            return NextResponse.json(
                { error: 'Missing required field: topic' },
                { status: 400 }
            );
        }

        const jobId = await enqueuePRDJob({
            topic,
            projectType: projectType || 'Full Stack App',
            modelId: modelId || getDefaultModelId(),
            userKeys,
            maxRounds: maxRounds || 3,
        });

        return NextResponse.json(
            {
                jobId,
                message: 'PRD generation started',
                streamUrl: `/api/jobs/${jobId}/stream`,
                statusUrl: `/api/jobs/${jobId}/status`,
            },
            { status: 202 }
        );
    } catch (error) {
        console.error('PRD start error:', error);
        return NextResponse.json(
            { error: 'Failed to start PRD generation' },
            { status: 500 }
        );
    }
}
