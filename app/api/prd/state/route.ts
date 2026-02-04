import { NextRequest, NextResponse } from 'next/server';
import { getPRDOrchestrator } from '@/lib/storage/orchestrators';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const orchestrator = getPRDOrchestrator(sessionId);

        if (!orchestrator) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        const prdState = orchestrator.getPRDState();

        return NextResponse.json({
            prdState,
            filledSections: orchestrator.getFilledSectionsCount(),
        });
    } catch (error) {
        console.error('Error getting PRD state:', error);
        return NextResponse.json(
            { error: 'Failed to get PRD state', details: String(error) },
            { status: 500 }
        );
    }
}
