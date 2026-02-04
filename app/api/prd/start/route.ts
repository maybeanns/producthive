import { NextRequest, NextResponse } from 'next/server';
import { PRDOrchestrator } from '@/lib/prd/orchestrator';
import { setPRDOrchestrator } from '@/lib/storage/orchestrators';

export async function POST(request: NextRequest) {
    try {
        const { topic, sessionId, projectType } = await request.json();

        if (!topic || typeof topic !== 'string') {
            return NextResponse.json(
                { error: 'Project topic is required' },
                { status: 400 }
            );
        }

        // Create new orchestrator for this session
        const orchestrator = new PRDOrchestrator();
        const session = sessionId || `session-${Date.now()}`;

        // Store orchestrator
        setPRDOrchestrator(session, orchestrator);

        // Start the debate
        const result = await orchestrator.startDebate(topic, projectType || 'Full Stack App');

        return NextResponse.json({
            sessionId: session,
            debateRound: {
                ...result.debateRound,
                responses: result.debateRound.responses.map(r => ({
                    ...r,
                    timestamp: r.timestamp.toISOString(),
                })),
            },
            prdState: result.prdState,
            filledSections: orchestrator.getFilledSectionsCount(),
        });
    } catch (error) {
        console.error('Error starting PRD debate:', error);
        return NextResponse.json(
            { error: 'Failed to start PRD generation', details: String(error) },
            { status: 500 }
        );
    }
}
