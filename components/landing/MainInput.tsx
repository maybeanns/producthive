'use client';

import { useState } from 'react';
import { Mic, Globe, Paperclip, ArrowRightLeft, Github, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { ProjectType } from '@/lib/types/agent-types';

const projectTypes: ProjectType[] = ['Full Stack App', 'Mobile App', 'Landing Page', 'Dashboard', 'Chrome Extension'];

export default function MainInput() {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [selectedType, setSelectedType] = useState<ProjectType>('Full Stack App');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        console.log('Creating project:', { type: selectedType, input });
        const params = new URLSearchParams({
            q: input,
            type: selectedType
        });
        router.push(`/workspace?${params.toString()}`);
    };

    return (
        <div className="max-w-3xl mx-auto mb-8 relative z-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={`
                    flex flex-col rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/5
                    ${isFocused ? 'ring-1 ring-primary/20' : ''}
                `}
            >
                {/* External Options Bar (Header) */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 w-full border-b border-border flex-wrap">
                    {projectTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedType(type)}
                            className={`
                                relative px-4 py-2 text-xs font-medium transition-all duration-200 flex items-center gap-2 flex-1 justify-center outline-none
                                ${selectedType === type
                                    ? 'text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            {selectedType === type && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                            {type}
                        </button>
                    ))}
                </div>

                {/* Main Input Area (Body) */}
                <div className="bg-card relative">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <div className="p-4 min-h-[120px]">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Build me an e-commerce platform with..."
                                className="
                                    w-full bg-transparent text-foreground placeholder:text-muted-foreground/50
                                    resize-none outline-none text-sm leading-relaxed
                                    tracking-tight
                                "
                                rows={3}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between px-3 pb-3 pt-2">
                            {/* Left Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    <Github className="w-4 h-4" />
                                </button>

                                <div className="h-4 w-[1px] bg-border mx-1" />

                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-orange-600 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <span className="text-orange-500 font-bold text-xs">✴</span>
                                    Claude 4.5 Sonnet
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Right Actions */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs text-muted-foreground transition-colors border border-border"
                                >
                                    <Globe className="w-3 h-3" />
                                    Public
                                </button>

                                <button
                                    type="button"
                                    className="p-2 text-primary hover:text-primary/80 transition-colors"
                                >
                                    <ArrowRightLeft className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Mic className="w-4 h-4" />
                                </button>

                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className={`
                                        p-2 rounded-full transition-all duration-300
                                        ${input.trim()
                                            ? 'bg-foreground text-background hover:scale-105'
                                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
