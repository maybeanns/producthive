'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface JobEvent {
    type: string;
    jobId?: string;
    agent?: string;
    role?: string;
    color?: string;
    round?: number;
    summary?: string;
    phase?: string;
    message?: string;
    modelUsed?: string;
    usedFallback?: boolean;
    fallbackReason?: string;
    data?: any;
    result?: any;
    error?: string;
    [key: string]: any;
}

export interface UseJobStreamReturn {
    events: JobEvent[];
    latestEvent: JobEvent | null;
    phase: string;
    progress: number;
    isConnected: boolean;
    isComplete: boolean;
    isError: boolean;
    error: string | null;
    result: any;
    connect: (jobId: string) => void;
    disconnect: () => void;
}

export function useJobStream(): UseJobStreamReturn {
    const [events, setEvents] = useState<JobEvent[]>([]);
    const [latestEvent, setLatestEvent] = useState<JobEvent | null>(null);
    const [phase, setPhase] = useState('');
    const [progress, setProgress] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const connect = useCallback((jobId: string) => {
        // Close any existing connection
        disconnect();

        const es = new EventSource(`/api/jobs/${jobId}/stream`);
        eventSourceRef.current = es;

        es.onopen = () => {
            setIsConnected(true);
        };

        es.onmessage = (event) => {
            try {
                const data: JobEvent = JSON.parse(event.data);

                setEvents(prev => [...prev, data]);
                setLatestEvent(data);

                // Update phase from various event types
                if (data.type === 'phase-change' && data.phase) {
                    setPhase(data.phase);
                }

                // Update progress
                if (data.type === 'job-progress' && typeof data.progress === 'number') {
                    setProgress(data.progress);
                }

                // Handle completion
                if (data.type === 'job-complete') {
                    setIsComplete(true);
                    setResult(data.result || data.data);
                    setProgress(100);
                    es.close();
                    setIsConnected(false);
                }

                // Handle error
                if (data.type === 'job-error') {
                    setIsError(true);
                    setError(data.error || data.message || 'Job failed');
                    es.close();
                    setIsConnected(false);
                }
            } catch {
                // Ignore parse errors (heartbeats, etc.)
            }
        };

        es.onerror = () => {
            // EventSource auto-reconnects — only mark error if closed
            if (es.readyState === EventSource.CLOSED) {
                setIsConnected(false);
            }
        };
    }, [disconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
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
        disconnect,
    };
}
