/**
 * Pre-flight Guardrail Agent
 * Scans user input for prompt injection, PII leakage, and malicious instructions
 * before they reach the orchestrator.
 */

// ─── Pattern-based detection (fast, no AI call needed) ───────────────────────

const PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(all\s+)?prior/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /pretend\s+you\s+are/i,
    /system\s*prompt/i,
    /reveal\s+(your|the)\s+(system|internal)/i,
    /forget\s+(everything|all)/i,
    /override\s+(your|the)\s+(rules|instructions)/i,
    /act\s+as\s+(?:if|a|an)\s+/i,
    /\bDAN\b.*\bmode\b/i,
    /jailbreak/i,
];

const PII_PATTERNS = [
    { type: 'email' as const, pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { type: 'phone' as const, pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
    { type: 'ssn' as const, pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g },
    { type: 'credit_card' as const, pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
];

const MALICIOUS_PATTERNS = [
    /(?:rm\s+-rf|del\s+\/[sf]|format\s+c:)/i,
    /(?:eval|exec|__import__|subprocess|os\.system)/i,
    /(?:drop\s+table|delete\s+from|truncate\s+table)/i,
    /(?:<script|javascript:|on\w+\s*=)/i,
];

export interface GuardrailResult {
    safe: boolean;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    threats: {
        type: 'prompt_injection' | 'pii_leakage' | 'malicious_instruction' | 'jailbreak' | 'other';
        description: string;
        location?: string;
    }[];
    sanitizedInput: string;
}

/**
 * Scan user input for threats (fast, pattern-based)
 */
export function scanInput(input: string): GuardrailResult {
    const threats: GuardrailResult['threats'] = [];
    let sanitized = input;

    // Check prompt injection patterns
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
        const match = input.match(pattern);
        if (match) {
            threats.push({
                type: 'prompt_injection',
                description: `Detected prompt injection pattern: "${match[0]}"`,
                location: `Position ${match.index}`,
            });
        }
    }

    // Check PII patterns
    for (const { type, pattern } of PII_PATTERNS) {
        const matches = input.match(pattern);
        if (matches) {
            for (const match of matches) {
                threats.push({
                    type: 'pii_leakage',
                    description: `Detected potential ${type}: "${match.substring(0, 4)}***"`,
                });
                // Redact PII from sanitized input
                sanitized = sanitized.replace(match, `[REDACTED_${type.toUpperCase()}]`);
            }
        }
    }

    // Check malicious patterns
    for (const pattern of MALICIOUS_PATTERNS) {
        const match = input.match(pattern);
        if (match) {
            threats.push({
                type: 'malicious_instruction',
                description: `Detected potentially malicious instruction: "${match[0]}"`,
            });
        }
    }

    // Determine severity
    let severity: GuardrailResult['severity'] = 'none';
    if (threats.length > 0) {
        const hasInjection = threats.some(t => t.type === 'prompt_injection' || t.type === 'jailbreak');
        const hasMalicious = threats.some(t => t.type === 'malicious_instruction');
        const hasPII = threats.some(t => t.type === 'pii_leakage');

        if (hasInjection && hasMalicious) severity = 'critical';
        else if (hasInjection || hasMalicious) severity = 'high';
        else if (hasPII) severity = 'medium';
        else severity = 'low';
    }

    return {
        safe: threats.length === 0,
        severity,
        threats,
        sanitizedInput: sanitized,
    };
}

/**
 * Quick check — returns true if input is safe, throws if critical
 */
export function assertSafe(input: string): string {
    const result = scanInput(input);

    if (result.severity === 'critical') {
        throw new Error(
            `Input blocked by security guardrails: ${result.threats.map(t => t.description).join('; ')}`
        );
    }

    // For non-critical threats, use sanitized input and continue
    return result.sanitizedInput;
}
