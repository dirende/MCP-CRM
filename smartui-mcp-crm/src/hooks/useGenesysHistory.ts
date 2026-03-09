import { useState, useEffect, useRef } from 'react';
import { GenesysInteraction } from '../models/interfaces/params';
import { Logger } from '../utils/Logger';

/**
 * useGenesysHistory — fetches the last 5 interactions for a contact from Genesys Cloud.
 *
 * Calls: GET /api/genesys/history?contactInfo=<phone|email>
 *
 * Features:
 *  - Automatically cancels in-flight requests when contactInfo changes (AbortController)
 *  - Falls back to mock data when backendUrl is empty (local development mode)
 *  - Re-fetches automatically whenever contactInfo or backendUrl changes
 *
 * @param contactInfo - Customer phone number or email address
 * @param backendUrl  - Backend base URL (e.g. "http://localhost:3000"). Empty = use mock data.
 * @returns { data, loading, error }
 */
export function useGenesysHistory(contactInfo: string, backendUrl: string) {
    const [data,    setData]    = useState<GenesysInteraction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    // AbortController ref — allows cancelling the previous fetch if contactInfo changes
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!contactInfo) return; // nothing to fetch without a contact

        // Cancel any in-flight request from the previous render
        abortRef.current?.abort();
        const controller  = new AbortController();
        abortRef.current  = controller;

        setLoading(true);
        setError(null);
        setData([]);

        const run = async () => {
            try {
                if (!backendUrl) {
                    // Development mode: simulate network delay and return mock data
                    await delay(1400);
                    setData(mockHistory(contactInfo));
                    return;
                }

                const url = `${backendUrl}/api/genesys/history` +
                    `?contactInfo=${encodeURIComponent(contactInfo)}`;

                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = await res.json();
                const interactions: GenesysInteraction[] = json.interactions || [];
                setData(interactions);
                Logger.log('useGenesysHistory', `${interactions.length} interactions loaded`);

            } catch (e: any) {
                if (e.name === 'AbortError') return; // request was intentionally cancelled
                Logger.error('useGenesysHistory', e);
                setError(e.message || 'Error fetching Genesys history');
            } finally {
                setLoading(false);
            }
        };

        run();

        // Cleanup: cancel the request if the component unmounts or contactInfo changes
        return () => controller.abort();
    }, [contactInfo, backendUrl]);

    return { data, loading, error };
}

// ── Mock Data (development / offline mode) ────────────────────────

/**
 * Mock interaction data keyed by contact identifier.
 * Used when backendUrl is empty (no backend running locally).
 */
const MOCK: Record<string, GenesysInteraction[]> = {
    '+393349089191': [
        { id: 'a1', startTime: '2026-03-05T09:12:00Z', mediaType: 'voice',        duration: '4m 32s', wrapup: 'Resolved',      direction: 'Inbound' },
        { id: 'a2', startTime: '2026-02-28T14:45:00Z', mediaType: 'email',        duration: '—',      wrapup: 'Follow-up',     direction: 'Inbound' },
        { id: 'a3', startTime: '2026-02-15T11:03:00Z', mediaType: 'webmessaging', duration: '12m 01s', wrapup: 'Resolved',     direction: 'Inbound' },
        { id: 'a4', startTime: '2026-01-30T08:55:00Z', mediaType: 'voice',        duration: '1m 47s', wrapup: 'Abandoned',     direction: 'Inbound' },
    ],
    'nicola.dirende@softphone.it': [
        { id: 'b1', startTime: '2026-03-01T10:30:00Z', mediaType: 'email',        duration: '—',      wrapup: 'Resolved',     direction: 'Inbound' },
        { id: 'b2', startTime: '2026-02-20T16:22:00Z', mediaType: 'voice',        duration: '6m 15s', wrapup: 'Callback',     direction: 'Inbound' },
    ],
    'mario.rossi@azienda.it': [
        { id: 'c1', startTime: '2026-03-06T13:10:00Z', mediaType: 'webmessaging', duration: '8m 42s', wrapup: 'Escalated',    direction: 'Inbound' },
    ],
    '393349089191': [
        { id: 'd1', startTime: '2026-02-10T07:07:00Z', mediaType: 'whatsapp',     duration: '20m',    wrapup: 'Other_Enquiry', direction: 'Inbound' },
        { id: 'd2', startTime: '2026-01-22T09:30:00Z', mediaType: 'voice',        duration: '3m 11s', wrapup: 'Resolved',     direction: 'Inbound' },
    ]
};

function mockHistory(contactInfo: string): GenesysInteraction[] {
    return MOCK[contactInfo] || [];
}

/** Simulates a network delay for mock data (milliseconds) */
function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}
