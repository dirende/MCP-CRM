import { useState, useEffect, useRef } from 'react';
import { CustomerIntel } from '../models/interfaces/params';
import { Logger } from '../utils/Logger';
import { delay } from '../utils/delay';

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
    messageRevision: number = 0
) {
    const [data,    setData]    = useState<CustomerIntel | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    // AbortController ref — cancels the previous fetch if inputs change
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!interactionId && !contactInfo) return; // nothing to analyze

        // Debounce: wait 2s after the last message before calling the backend.
        // This prevents aborting every Gemini call when messages arrive in rapid succession.
        const timer = setTimeout(() => {
            // Cancel any previous in-flight request before starting a new one
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setLoading(true);
            setError(null);
            // Note: intentionally NOT resetting data to null —
            // keep showing the last known result while re-analyzing.

            const run = async () => {
                try {
                    if (!backendUrl) {
                        await delay(1200);
                        setData(mockIntel(contactInfo));
                        return;
                    }

                    const url = `${backendUrl}/api/transcript/analyze` +
                        `?interactionId=${encodeURIComponent(interactionId)}` +
                        `&contactInfo=${encodeURIComponent(contactInfo)}`;

                    const res = await fetch(url, { signal: controller.signal });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const json = await res.json() as CustomerIntel;
                    Logger.log('useTranscriptAnalysis', json);

                    // Non-regression: if the new result is 'unknown' but we already have a
                    // more specific classification, keep the previous requestType and caseNumber
                    // (Gemini can return 'unknown' on a retry even after correctly classifying
                    //  check_status/close_case, which would cause the chip to revert to grey).
                    const SPECIFIC = ['new_case', 'existing_case', 'check_status', 'close_case'];
                    setData(prev => {
                        if (json.requestType === 'unknown' && prev && SPECIFIC.includes(prev.requestType)) {
                            return {
                                ...json,
                                requestType: prev.requestType,
                                caseNumber:  json.caseNumber ?? prev.caseNumber,
                            };
                        }
                        return json;
                    });

                } catch (e: any) {
                    if (e.name === 'AbortError') return; // request was intentionally cancelled
                    Logger.error('useTranscriptAnalysis', e);
                    setError(e.message || 'Error analyzing transcript');
                } finally {
                    setLoading(false);
                }
            };

            run();
        }, 2000); // wait 2s after last message before triggering analysis

        // Cleanup: cancel the debounce timer if a new message arrives before it fires
        return () => clearTimeout(timer);
    }, [interactionId, contactInfo, backendUrl, messageRevision]);

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

