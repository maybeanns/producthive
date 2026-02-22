'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, ChevronRight, User, Loader2 } from 'lucide-react';

import { ProjectType } from '@/lib/types/agent-types';
import { loadSettings } from '@/components/landing/SettingsPanel';

interface WorkspaceChatProps {
    initialInput: string;
    initialType: ProjectType;
    jobId?: string;
    modelId?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    type?: ProjectType;
    timestamp: Date;
}

export default function WorkspaceChat({ initialInput, initialType, jobId, modelId }: WorkspaceChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'user',
            content: initialInput,
            type: initialType,
            timestamp: new Date(),
        },
        ...(jobId ? [{
            id: '2',
            role: 'system' as const,
            content: `🚀 PRD generation started. Agents are debating your project idea...`,
            timestamp: new Date(),
        }] : []),
    ]);
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSubmitting) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsSubmitting(true);

        try {
            // Build user keys
            const settings = loadSettings();
            const userKeys: Record<string, string> = {};
            if (settings.groqKey) userKeys['GROQ_API_KEY'] = settings.groqKey;
            if (settings.openaiKey) userKeys['OPENAI_API_KEY'] = settings.openaiKey;
            if (settings.anthropicKey) userKeys['ANTHROPIC_API_KEY'] = settings.anthropicKey;

            const response = await fetch('/api/prd/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: jobId || 'unknown',
                    userInput: input.trim(),
                    modelId: modelId || undefined,
                    userKeys: Object.keys(userKeys).length > 0 ? userKeys : undefined,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'system',
                    content: `✅ Debate continuation started (Job: ${data.jobId}). Watch the right panel for updates.`,
                    timestamp: new Date(),
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: 'I encountered an issue processing that. Please try again.',
                    timestamp: new Date(),
                }]);
            }
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Connection error. Please check your connection and try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary text-sm font-bold">✴</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">ProductHive</h2>
                        <p className="text-[10px] text-muted-foreground">
                            {jobId ? `Job: ${jobId.slice(0, 16)}...` : 'Multi-Agent Workspace'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role !== 'user' && (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'system' ? 'bg-blue-500/10' : 'bg-white/10'
                                }`}>
                                <span className={`text-xs font-bold ${msg.role === 'system' ? 'text-blue-400' : 'text-orange-500'
                                    }`}>
                                    {msg.role === 'system' ? '⚡' : '✴'}
                                </span>
                            </div>
                        )}

                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-muted text-foreground rounded-tr-none'
                                : msg.role === 'system'
                                    ? 'bg-blue-500/5 border border-blue-500/20 text-foreground rounded-tl-none'
                                    : 'bg-card border border-border text-foreground rounded-tl-none'
                            }`}>
                            {msg.content}
                            {msg.type && msg.role === 'user' && (
                                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                                    {msg.type}
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                        )}
                    </div>
                ))}

                {isSubmitting && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Follow up on the PRD..."
                        className="
                            w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50
                            rounded-xl p-3 pr-12 text-sm resize-none outline-none focus:ring-1 focus:ring-border
                            scrollbar-none
                        "
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={!input.trim() || isSubmitting}
                            className={`
                                p-1.5 rounded-lg transition-all
                                ${input.trim() && !isSubmitting
                                    ? 'bg-foreground text-background hover:opacity-90'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                                }
                            `}
                        >
                            {isSubmitting
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <ChevronRight className="w-4 h-4" />
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
