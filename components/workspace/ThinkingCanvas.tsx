'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, FileText, Code, ChevronRight } from 'lucide-react';

interface ThinkingStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed';
}

const steps: ThinkingStep[] = [
    { id: '1', label: 'Analyzing project requirements', status: 'pending' },
    { id: '2', label: 'Drafting architecture', status: 'pending' },
    { id: '3', label: 'Generating PRD', status: 'pending' },
];

export default function ThinkingCanvas() {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Simulate thinking process
        const interval = setInterval(() => {
            setCurrentStepIndex(prev => {
                if (prev >= steps.length) {
                    clearInterval(interval);
                    setIsComplete(true);
                    return prev;
                }
                return prev + 1;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full bg-muted/30 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Mesh (Subtle) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none" />

            <div className="max-w-md w-full relative z-10 space-y-8">
                {!isComplete ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <h2 className="text-2xl font-light text-center text-foreground">
                            Building your vision...
                        </h2>

                        <div className="space-y-4">
                            {steps.map((step, index) => {
                                const isActive = index === currentStepIndex;
                                const isCompleted = index < currentStepIndex;

                                return (
                                    <motion.div
                                        key={step.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.2 }}
                                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${isActive
                                            ? 'bg-card border-border shadow-lg shadow-blue-500/5'
                                            : isCompleted
                                                ? 'bg-transparent border-transparent opacity-50'
                                                : 'bg-transparent border-transparent opacity-30'
                                            }`}
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300
                                            ${isActive
                                                ? 'border-blue-400 text-blue-400'
                                                : isCompleted
                                                    ? 'bg-green-500/20 border-green-500 text-green-500'
                                                    : 'border-white/20 text-white/20'
                                            }
                                        `}>
                                            {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {isCompleted && <Check className="w-4 h-4" />}
                                        </div>
                                        <span className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {step.label}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="text-center space-y-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
                            <FileText className="w-10 h-10 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-2">PRD Ready</h2>
                            <p className="text-muted-foreground">Successfully generated requirements for "E-commerce platform"</p>
                        </div>
                        <button className="px-6 py-3 bg-foreground text-background rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                            View Documentation <ChevronRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
