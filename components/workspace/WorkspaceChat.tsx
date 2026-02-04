'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Globe, Paperclip, Github, ChevronDown, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ProjectType } from '@/lib/types/agent-types';

const projectTypes: ProjectType[] = ['Full Stack App', 'Mobile App', 'Landing Page', 'Dashboard', 'Chrome Extension'];

interface WorkspaceChatProps {
    initialInput: string;
    initialType: ProjectType;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type?: ProjectType;
}

export default function WorkspaceChat({ initialInput, initialType }: WorkspaceChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'user', content: initialInput, type: initialType }
    ]);
    const [input, setInput] = useState('');
    const [selectedType, setSelectedType] = useState<ProjectType>(initialType);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            type: selectedType
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');

        // Mock assistant response for now
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm processing that update. Check the right panel for the latest thoughts."
            }]);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            {/* Header / Options */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-1 flex-wrap">
                    {projectTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedType(type)}
                            className={`
                                relative px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-2
                                ${selectedType === type
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }
                            `}
                        >
                            {type.startsWith('Full') && <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />}
                            {type.startsWith('Mobile') && <span className="w-1.5 h-1.5 rounded-full bg-none" />}
                            {type.startsWith('Landing') && <span className="w-1.5 h-1.5 rounded-full bg-none" />}
                            {type === 'Dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-none border border-current opacity-60" />}
                            {type === 'Chrome Extension' && <span className="w-1.5 h-1.5 rounded-full bg-none border border-current opacity-60" />}
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-orange-500 text-xs font-bold">✴</span>
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-muted text-foreground rounded-tr-none'
                            : 'bg-card border border-border text-foreground rounded-tl-none'
                            }`}>
                            {msg.content}
                            {msg.type && msg.role === 'user' && (
                                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                    {msg.type}
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-blue-400" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Follow up..."
                        className="
                            w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50
                            rounded-xl p-3 pr-12 text-sm resize-none outline-none focus:ring-1 focus:ring-border
                            scrollbar-none
                        "
                        rows={3}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                            type="button"
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className={`
                                p-1.5 rounded-lg transition-all
                                ${input.trim()
                                    ? 'bg-foreground text-background hover:opacity-90'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                                }
                            `}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
