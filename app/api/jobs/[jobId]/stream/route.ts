/**
 * SSE Stream Endpoint — Real-time job event streaming
 * GET /api/jobs/[jobId]/stream
 */

import { NextRequest } from 'next/server';
import { subscribeToJob } from '@/lib/events/emitter';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection event
            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`)
            );

            // Subscribe to Redis pub/sub for this job
            const unsubscribe = subscribeToJob(jobId, (event) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                    );

                    // Close stream on terminal events
                    if (event.type === 'job-complete' || event.type === 'job-error') {
                        setTimeout(() => {
                            try {
                                controller.close();
                            } catch {
                                // Already closed
                            }
                        }, 1000);
                    }
                } catch {
                    // Stream might be closed by client
                }
            });

            // Send heartbeat every 30s to keep connection alive
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 30000);

            // Clean up on abort
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeat);
                unsubscribe();
                try {
                    controller.close();
                } catch {
                    // Already closed
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
