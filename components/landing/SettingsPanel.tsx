'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Key, Server, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsData {
    groqKey: string;
    openaiKey: string;
    anthropicKey: string;
    jiraHost: string;
    jiraEmail: string;
    jiraApiToken: string;
    jiraProjectKey: string;
}

const STORAGE_KEY = 'producthive-settings';

function loadSettings(): SettingsData {
    if (typeof window === 'undefined') return getDefaults();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...getDefaults(), ...JSON.parse(raw) } : getDefaults();
    } catch {
        return getDefaults();
    }
}

function getDefaults(): SettingsData {
    return {
        groqKey: '',
        openaiKey: '',
        anthropicKey: '',
        jiraHost: '',
        jiraEmail: '',
        jiraApiToken: '',
        jiraProjectKey: '',
    };
}

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: SettingsData) => void;
}

export default function SettingsPanel({ isOpen, onClose, onSave }: SettingsPanelProps) {
    const [settings, setSettings] = useState<SettingsData>(getDefaults());
    const [saved, setSaved] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSettings(loadSettings());
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [isOpen, onClose]);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        onSave(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const update = (key: keyof SettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full bg-card border-x border-b border-border rounded-b-2xl shadow-2xl shadow-black/20 z-10 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                        <h3 className="text-sm font-semibold text-foreground">Settings</h3>
                        <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="p-4 space-y-5 max-h-[400px] overflow-y-auto">
                        {/* API Keys Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <Key className="w-3 h-3" />
                                API Keys
                            </div>

                            <InputField
                                label="Groq API Key"
                                placeholder="gsk_..."
                                value={settings.groqKey}
                                onChange={(v) => update('groqKey', v)}
                                hint="Free at console.groq.com — enables Llama, Qwen, Kimi"
                            />
                            <InputField
                                label="OpenAI API Key"
                                placeholder="sk-..."
                                value={settings.openaiKey}
                                onChange={(v) => update('openaiKey', v)}
                                hint="Optional — enables GPT models"
                            />
                            <InputField
                                label="Anthropic API Key"
                                placeholder="sk-ant-..."
                                value={settings.anthropicKey}
                                onChange={(v) => update('anthropicKey', v)}
                                hint="Optional — enables Claude models"
                            />
                        </div>

                        <div className="h-px bg-border" />

                        {/* Jira Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <Server className="w-3 h-3" />
                                Jira Integration
                            </div>

                            <InputField
                                label="Jira Host"
                                placeholder="https://your-company.atlassian.net"
                                value={settings.jiraHost}
                                onChange={(v) => update('jiraHost', v)}
                            />
                            <InputField
                                label="Jira Email"
                                placeholder="you@company.com"
                                value={settings.jiraEmail}
                                onChange={(v) => update('jiraEmail', v)}
                            />
                            <InputField
                                label="Jira API Token"
                                placeholder="ATATT..."
                                value={settings.jiraApiToken}
                                onChange={(v) => update('jiraApiToken', v)}
                                hint="Generate at id.atlassian.com/manage-profile/security/api-tokens"
                            />
                            <InputField
                                label="Project Key"
                                placeholder="PROJ"
                                value={settings.jiraProjectKey}
                                onChange={(v) => update('jiraProjectKey', v)}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                            Keys stored in browser only
                        </p>
                        <button
                            onClick={handleSave}
                            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${saved
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-foreground text-background hover:opacity-90'
                                }`}
                        >
                            {saved ? '✓ Saved' : 'Save'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function InputField({
    label,
    placeholder,
    value,
    onChange,
    hint,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
}) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/80">{label}</label>
            <input
                type="password"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
            {hint && (
                <p className="text-[10px] text-muted-foreground/70 leading-tight">{hint}</p>
            )}
        </div>
    );
}

export { loadSettings };
export type { SettingsData };
