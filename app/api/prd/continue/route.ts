/**
 * PRD Continue — V2 Async
 * POST /api/prd/continue → 202 Accepted + { jobId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { enqueueContinueJob } from '@/lib/queue/producers';
import { getDefaultModelId } from '@/lib/ai/model-registry';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId, userInput, modelId, userKeys } = body;

        if (!jobId || !userInput) {
            return NextResponse.json(
                { error: 'Missing required fields: jobId, userInput' },
                { status: 400 }
            );
        }

        const newJobId = await enqueueContinueJob({
            jobId,
            userInput,
            modelId: modelId || getDefaultModelId(),
            userKeys,
        });

        return NextResponse.json(
            {
                jobId: newJobId,
                message: 'Debate continuation started',
                streamUrl: `/api/jobs/${newJobId}/stream`,
                statusUrl: `/api/jobs/${newJobId}/status`,
            },
            { status: 202 }
        );
    } catch (error) {
        console.error('PRD continue error:', error);
        return NextResponse.json(
            { error: 'Failed to continue debate' },
            { status: 500 }
        );
    }
}
