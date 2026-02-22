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

        let newJobId: string;
        try {
            newJobId = await enqueueContinueJob({
                jobId,
                userInput,
                modelId: modelId || getDefaultModelId(),
                userKeys,
            });
        } catch (error) {
            console.warn('[Queue] Redis unavailable for continue, falling back to inline');
            newJobId = `continue-inline-${Date.now()}`;

            // Execute in background
            import('@/lib/prd/runner').then(({ runPRDGeneration }) => {
                runPRDGeneration({
                    jobId: newJobId,
                    topic: userInput, // Using user input as the "topic" to continue
                    projectType: 'Continuation', // Flagging as continuation
                    modelId: modelId || getDefaultModelId(),
                    userKeys,
                }).catch(err => console.error('[InlineContinue] Failed:', err));
            });
        }

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
