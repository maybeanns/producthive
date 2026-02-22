'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import WorkspaceChat from '@/components/workspace/WorkspaceChat';
import ThinkingCanvas from '@/components/workspace/ThinkingCanvas';

function WorkspaceContent() {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';
    const type = (searchParams.get('type') as any) || 'Full Stack App';
    const jobId = searchParams.get('jobId') || undefined;
    const modelId = searchParams.get('model') || undefined;

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Main Workspace Area below fixed navbar */}
            <div className="flex flex-1 mt-14 overflow-hidden">
                {/* Left Pane - Chat & Inputs */}
                <div className="w-[400px] flex-shrink-0 h-full relative z-20 shadow-2xl border-r border-border/50 bg-card">
                    <WorkspaceChat
                        initialInput={q}
                        initialType={type}
                        jobId={jobId}
                        modelId={modelId}
                    />
                </div>

                {/* Right Pane - Thinking & Result */}
                <div className="flex-1 h-full relative z-10 overflow-hidden">
                    <ThinkingCanvas jobId={jobId} />
                </div>
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
