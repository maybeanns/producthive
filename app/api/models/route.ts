/**
 * Models API — Get available AI models for the frontend model selector
 * GET /api/models
 */

import { NextResponse } from 'next/server';
import { getAvailableModels, getDefaultModelId } from '@/lib/ai/model-registry';

export async function GET() {
    try {
        const models = getAvailableModels();
        const defaultId = getDefaultModelId();

        return NextResponse.json({
            models: models.map(m => ({
                id: m.id,
                name: m.name,
                provider: m.providerId,
                costTier: m.costTier,
                contextWindow: m.contextWindow,
                capabilities: m.capabilities,
            })),
            default: defaultId,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
