'use client';

import { Github, FileCode, Zap, Upload, Workflow, Database } from 'lucide-react';
import { motion } from 'framer-motion';

const tools = [
    { icon: Github, label: 'GitHub', color: 'text-foreground' },
    { icon: FileCode, label: 'Claude A.I.', color: 'text-accent' },
    { icon: Zap, label: 'Deploy', color: 'text-yellow-400' },
    { icon: Upload, label: 'Publish', color: 'text-green-400' },
    { icon: Workflow, label: 'CI/CD', color: 'text-blue-400' },
    { icon: Database, label: 'Database', color: 'text-purple-400' },
];

export default function ToolIntegrationBar() {
    return (
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-4"
            >
                <div className="flex items-center justify-center gap-6 flex-wrap">
                    <span className="text-sm text-muted-foreground font-medium">Integrated with:</span>

                    {tools.map((tool, index) => {
                        const Icon = tool.icon;
                        return (
                            <motion.div
                                key={tool.label}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                whileHover={{ scale: 1.1, y: -2 }}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <div className={`p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors ${tool.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                    {tool.label}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
