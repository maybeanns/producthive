import { NextRequest, NextResponse } from 'next/server';
import { PRDOrchestrator } from '@/lib/prd/orchestrator';
import { getPRDOrchestrator, setPRDOrchestrator } from '@/lib/storage/orchestrators';

export async function POST(request: NextRequest) {
    try {
        const { sessionId, userMessage } = await request.json();

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const orchestrator = getPRDOrchestrator(sessionId);

        if (!orchestrator) {
            return NextResponse.json(
                { error: 'Session not found. Please start a new PRD generation.' },
                { status: 404 }
            );
        }

        // Continue the debate
        const result = await orchestrator.continueDebate(userMessage);

        return NextResponse.json({
            sessionId,
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
        console.error('Error continuing PRD debate:', error);
        return NextResponse.json(
            { error: 'Failed to continue PRD generation', details: String(error) },
            { status: 500 }
        );
    }
}
