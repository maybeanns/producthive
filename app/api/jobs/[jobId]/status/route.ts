/**
 * Job Status Endpoint — Polling fallback for job status
 * GET /api/jobs/[jobId]/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/queue/producers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;
        const status = await getJobStatus(jobId);

        if (!status) {
            return NextResponse.json(
                { error: 'Job not found', jobId },
                { status: 404 }
            );
        }

        return NextResponse.json({
            jobId,
            ...status,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch job status' },
            { status: 500 }
        );
    }
}
