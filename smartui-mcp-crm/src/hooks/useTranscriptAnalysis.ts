import { useState, useEffect, useRef } from 'react';
import { CustomerIntel } from '../models/interfaces/params';
import { Logger } from '../utils/Logger';

/**
 * useTranscriptAnalysis — fetches AI-analyzed customer intelligence for the current interaction.
 *
 * Calls: GET /api/transcript/analyze?interactionId=<id>&contactInfo=<phone|email>
 *
 * The backend fetches the Genesys transcript and analyzes it via Claude AI (or heuristics).
 * The result is a CustomerIntel object with: name, contact, requestType, caseNumber, excerpt.
 *
 * Features:
 *  - Cancels in-flight requests when interactionId/contactInfo changes (AbortController)
 *  - Falls back to mock data when backendUrl is empty (local development mode)
 *  - Re-fetches automatically on interactionId, contactInfo, or backendUrl change
 *
 * @param interactionId - Genesys conversation ID (can be empty string)
 * @param contactInfo   - Customer phone or email
 * @param backendUrl    - Backend base URL. Empty = use mock data.
 * @returns { data, loading, error }
 */
export function useTranscriptAnalysis(
    interactionId: string,
    contactInfo:   string,
    backendUrl:    string,
    hasMessages:   boolean = false
) {
    const [data,    setData]    = useState<CustomerIntel | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    // AbortController ref — cancels the previous fetch if inputs change
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!interactionId && !contactInfo) return; // nothing to analyze

        // Cancel any in-flight request from the previous render
        abortRef.current?.abort();
        const controller  = new AbortController();
        abortRef.current  = controller;

        setLoading(true);
        setError(null);
        setData(null);

        const run = async () => {
            try {
                if (!backendUrl) {
                    // Development mode: simulate network delay and return mock data
                    await delay(1200);
                    setData(mockIntel(contactInfo));
                    return;
                }

                const url = `${backendUrl}/api/transcript/analyze` +
                    `?interactionId=${encodeURIComponent(interactionId)}` +
                    `&contactInfo=${encodeURIComponent(contactInfo)}`;

                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = await res.json();
                setData(json as CustomerIntel);
                Logger.log('useTranscriptAnalysis', json);

            } catch (e: any) {
                if (e.name === 'AbortError') return; // request was intentionally cancelled
                Logger.error('useTranscriptAnalysis', e);
                setError(e.message || 'Error analyzing transcript');
            } finally {
                setLoading(false);
            }
        };

        run();

        // Cleanup: cancel the request if the component unmounts or inputs change
        return () => controller.abort();
    }, [interactionId, contactInfo, backendUrl, hasMessages]);

    return { data, loading, error };
}

// ── Mock Data (development / offline mode) ────────────────────────

/**
 * Mock CustomerIntel data keyed by contact identifier.
 * Used when backendUrl is empty (no backend running locally).
 */
const MOCK_DATA: Record<string, CustomerIntel> = {
    '+393349089191': {
        customerName: 'Nicola Di Rende',
        contact:      '+393349089191',
        requestType:  'existing_case',
        caseNumber:   'INC0010234',
        excerpt:      'Cliente: Chiamo per il problema del VPN...\nAgente: Mi dà il numero del caso?\nCliente: INC0010234.'
    },
    'nicola.dirende@softphone.it': {
        customerName: 'Nicola Di Rende',
        contact:      'nicola.dirende@softphone.it',
        requestType:  'new_case',
        excerpt:      'Email: Richiesta apertura nuovo caso\nVorrei aprire un caso per un problema con le email...'
    },
    'mario.rossi@azienda.it': {
        customerName: 'Mario Rossi',
        contact:      'mario.rossi@azienda.it',
        requestType:  'new_case',
        excerpt:      'Cliente: Non riesco ad accedere al portale clienti da ieri...'
    },
    '393349089191': {
        customerName: 'Ibrahim Taha',
        contact:      '393349089191',
        requestType:  'existing_case',
        caseNumber:   'INC0009100',
        excerpt:      'Cliente: Vorrei un aggiornamento sul caso INC0009100.'
    }
};

function mockIntel(contactInfo: string): CustomerIntel {
    return MOCK_DATA[contactInfo] || {
        customerName: 'Cliente non identificato',
        contact:      contactInfo,
        requestType:  'unknown',
        excerpt:      '(transcript in elaborazione...)'
    };
}

/** Simulates a network delay for mock data (milliseconds) */
function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}
