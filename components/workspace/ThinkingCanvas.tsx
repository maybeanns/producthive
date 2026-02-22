'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, FileText, Code, Github, AlertCircle, Zap, ExternalLink } from 'lucide-react';
import { useJobStream, type JobEvent } from '@/lib/hooks/useJobStream';

// ── Phase Definitions ────────────────────────────────────────────────────────

const PHASE_STEPS = [
    { phase: 'guardrail', label: 'Scanning input for security threats', icon: '🛡️' },
    { phase: 'cache-check', label: 'Checking for cached PRD', icon: '⚡' },
    { phase: 'debate', label: 'Multi-agent debate in progress', icon: '🗣️' },
    { phase: 'consensus', label: 'Synthesizing final PRD', icon: '🤝' },
    { phase: 'persist', label: 'Saving PRD results', icon: '💾' },
    { phase: 'planning', label: 'Creating development plan', icon: '📋' },
    { phase: 'jira', label: 'Creating Jira tasks', icon: '📊' },
    { phase: 'github-init', label: 'Setting up GitHub repository', icon: '📦' },
    { phase: 'code-gen', label: 'Generating code files', icon: '💻' },
    { phase: 'readme', label: 'Writing documentation', icon: '📄' },
    { phase: 'github-push', label: 'Pushing code to GitHub', icon: '🚀' },
];

interface ThinkingCanvasProps {
    jobId?: string;
}

export default function ThinkingCanvas({ jobId }: ThinkingCanvasProps) {
    const {
        events,
        latestEvent,
        phase,
        progress,
        isConnected,
        isComplete,
        isError,
        error,
        result,
        connect,
    } = useJobStream();

    // Connect to SSE when jobId is provided
    useEffect(() => {
        if (jobId) {
            connect(jobId);
        }
    }, [jobId, connect]);

    // Extract agent debate entries from events
    const agentMessages = useMemo(() => {
        return events.filter(e => e.type === 'agent-response');
    }, [events]);

    // Get current step index based on phase
    const currentPhaseIndex = useMemo(() => {
        return PHASE_STEPS.findIndex(s => s.phase === phase);
    }, [phase]);

    // No jobId — show waiting state
    if (!jobId) {
        return (
            <div className="h-full bg-muted/30 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none" />
                <div className="relative z-10 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto border border-border">
                        <Zap className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-xl font-light text-muted-foreground">
                        Describe your project to begin
                    </h2>
                    <p className="text-sm text-muted-foreground/60 max-w-sm">
                        Enter your idea in the input box, select a model, and hit enter to start the multi-agent PRD generation.
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="h-full bg-muted/30 p-8 flex flex-col items-center justify-center">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground">{error || 'An unexpected error occurred.'}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Complete state
    if (isComplete) {
        const repoUrl = result?.repoUrl;
        const jiraUrl = result?.jira?.url;
        const totalFiles = result?.totalFiles || 0;
        const keyDecisions = result?.keyDecisions || [];

        return (
            <div className="h-full bg-muted/30 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/10 via-background to-background pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="max-w-md w-full relative z-10 text-center space-y-8"
                >
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
                        <Code className="w-10 h-10 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-foreground mb-2">Build Successful</h2>
                        <p className="text-muted-foreground">
                            {totalFiles > 0 ? `${totalFiles} files generated.` : 'Your project is ready.'}
                        </p>
                    </div>

                    {/* Key Decisions */}
                    {keyDecisions.length > 0 && (
                        <div className="text-left bg-card rounded-xl border border-border p-4 space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Decisions</h3>
                            {keyDecisions.slice(0, 5).map((d: any, i: number) => (
                                <div key={i} className="text-xs text-foreground/80">
                                    <span className="font-medium">{d.topic || d.decision}:</span>{' '}
                                    {d.rationale || d.reasoning || ''}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        {repoUrl && (
                            <a
                                href={repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-6 py-3 bg-foreground text-background rounded-xl font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                                <Github className="w-4 h-4" /> View GitHub Repository
                                <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                            </a>
                        )}
                        {jiraUrl && (
                            <a
                                href={jiraUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText className="w-4 h-4" /> Open Jira Breakdown
                                <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                            </a>
                        )}
                        {!repoUrl && !jiraUrl && (
                            <p className="text-sm text-muted-foreground">
                                PRD generated successfully. Check the chat for details.
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    // Active / In-Progress state
    return (
        <div className="h-full bg-muted/30 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none" />

            {/* Progress Bar */}
            <div className="h-1 bg-muted relative z-20">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                <div className="max-w-lg mx-auto space-y-8">
                    {/* Phase Header */}
                    <div className="text-center">
                        <h2 className="text-2xl font-light text-foreground">
                            Building your vision...
                        </h2>
                        {latestEvent?.message && (
                            <p className="text-sm text-muted-foreground mt-2">{latestEvent.message}</p>
                        )}
                    </div>

                    {/* Pipeline Steps */}
                    <div className="space-y-2">
                        {PHASE_STEPS.map((step, index) => {
                            const isActive = step.phase === phase;
                            const isCompleted = index < currentPhaseIndex;
                            const isPending = index > currentPhaseIndex;

                            if (isPending && currentPhaseIndex === -1 && index > 0) return null; // Hide future steps before first phase

                            return (
                                <motion.div
                                    key={step.phase}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-500 ${isActive
                                        ? 'bg-card border-border shadow-lg shadow-blue-500/5'
                                        : isCompleted
                                            ? 'bg-transparent border-transparent opacity-60'
                                            : 'bg-transparent border-transparent opacity-20'
                                        }`}
                                >
                                    <div className={`
                                        w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300
                                        ${isActive
                                            ? 'border-blue-400 text-blue-400'
                                            : isCompleted
                                                ? 'bg-green-500/20 border-green-500 text-green-500'
                                                : 'border-border text-muted-foreground/30'
                                        }
                                    `}>
                                        {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                                        {isPending && <span className="text-xs">{step.icon}</span>}
                                    </div>
                                    <span className={`text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                        {step.label}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Agent Debate Messages */}
                    {agentMessages.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-border/50">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Agent Debate
                            </h3>
                            {agentMessages.slice(-6).map((msg, i) => {
                                const agentName = msg.agent || msg.agentName || msg.data?.agentName || 'Agent';
                                const summary = msg.summary || msg.message || msg.data?.reasoning || msg.data?.summary || 'Analyzing...';
                                const color = msg.color || msg.data?.agentColor || '#6366F1';
                                const round = msg.round || msg.data?.round || 0;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border/50"
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm"
                                            style={{ backgroundColor: color }}
                                        >
                                            {agentName[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground">{agentName}</span>
                                                <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 bg-muted rounded">Round {round}</span>
                                                {(msg.usedFallback || msg.data?.usedFallback) && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded font-medium">
                                                        fallback
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                                                {summary}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
