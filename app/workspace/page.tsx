'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import WorkspaceChat from '@/components/workspace/WorkspaceChat';
import ThinkingCanvas from '@/components/workspace/ThinkingCanvas';

// Separate component to handle search params
function WorkspaceContent() {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';
    const type = (searchParams.get('type') as any) || 'Full Stack App';

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Left Pane - Chat & Inputs */}
            <div className="w-[400px] flex-shrink-0 h-full relative z-20 shadow-2xl">
                <WorkspaceChat initialInput={q} initialType={type} />
            </div>

            {/* Right Pane - Thinking & Result */}
            <div className="flex-1 h-full relative z-10">
                <ThinkingCanvas />
            </div>
        </div>
    );
}

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
            <WorkspaceContent />
        </Suspense>
    );
}
