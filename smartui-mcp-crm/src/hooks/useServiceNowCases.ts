import { useState, useEffect, useRef } from 'react';
import { SnowCase } from '../models/interfaces/params';
import { Logger } from '../utils/Logger';
import { delay } from '../utils/delay';

/**
 * useServiceNowCases — fetches ServiceNow incidents for a contact and supports creating new ones.
 *
 * GET  /api/servicenow/cases?contactInfo=<phone|email>  → load existing incidents
 * POST /api/servicenow/cases { contactInfo, interactionId, short_description } → create incident
 *
 * Features:
 *  - Cancels in-flight GET requests when contactInfo changes (AbortController)
 *  - Falls back to mock data when backendUrl is empty (local development mode)
 *  - After creating a case: prepends it to the list and opens its URL (screen pop)
 *
 * @param contactInfo - Customer phone or email
 * @param backendUrl  - Backend base URL. Empty = use mock data.
 * @returns { cases, loading, error, creating, createCase }
 */
export function useServiceNowCases(contactInfo: string, backendUrl: string) {
    const [cases,    setCases]    = useState<SnowCase[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState<string | null>(null);
    const [creating, setCreating] = useState(false); // true while POST is in flight

    // AbortController ref — cancels the previous GET if contactInfo changes
    const abortRef = useRef<AbortController | null>(null);

    // ── Fetch Cases ───────────────────────────────────────────────

    useEffect(() => {
        if (!contactInfo) return;

        // Cancel any in-flight request from the previous render
        abortRef.current?.abort();
        const controller  = new AbortController();
        abortRef.current  = controller;

        setLoading(true);
        setError(null);
        setCases([]);

        const run = async () => {
            try {
                if (!backendUrl) {
                    // Development mode: simulate network delay and return mock data
                    await delay(1800);
                    setCases(mockCases(contactInfo));
                    return;
                }

                const url = `${backendUrl}/api/servicenow/cases` +
                    `?contactInfo=${encodeURIComponent(contactInfo)}`;

                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json  = await res.json();
                const items: SnowCase[] = json.cases || [];
                setCases(items);
                Logger.log('useServiceNowCases', `${items.length} cases found`);

            } catch (e: any) {
                if (e.name === 'AbortError') return; // request was intentionally cancelled
                Logger.error('useServiceNowCases', e);
                setError(e.message || 'Error fetching ServiceNow cases');
            } finally {
                setLoading(false);
            }
        };

        run();

        // Cleanup: cancel the request if the component unmounts or contactInfo changes
        return () => controller.abort();
    }, [contactInfo, backendUrl]);

    // ── Create Case ───────────────────────────────────────────────

    /**
     * Creates a new ServiceNow incident and adds it to the top of the case list.
     * Also triggers a screen pop: opens the new case URL in a new browser tab.
     *
     * @param contactInfoArg - Customer contact (can differ from the hook's contactInfo)
     * @param interactionId  - Current Genesys interaction ID (stored in work_notes)
     */
    async function createCase(
        contactInfoArg: string,
        interactionId:  string,
        shortDescription?: string,
        onCreated?: (c: SnowCase) => void
    ) {
        if (creating) return; // prevent duplicate submissions
        setCreating(true);

        try {
            let newCase: SnowCase;
            const desc = shortDescription || 'Incident created by MCP-CRM Integration';

            if (!backendUrl) {
                // Development mode: generate a fake case number and return immediately
                await delay(1000);
                const fakeNum = `INC${String(10000 + Math.floor(Math.random() * 1000)).padStart(7, '0')}`;
                newCase = {
                    sys_id:     'mock-' + Date.now(),
                    number:     fakeNum,
                    subject:    desc,
                    state:      'New',
                    openedAt:   new Date().toLocaleDateString('it-IT'),
                    assignedTo: 'Unassigned',
                    url:        undefined
                };
            } else {
                const res = await fetch(`${backendUrl}/api/servicenow/cases`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        contactInfo:       contactInfoArg,
                        interactionId,
                        short_description: desc
                    })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                newCase = await res.json() as SnowCase;
            }

            Logger.log('createCase', newCase);

            // Prepend the new case to the top of the list
            setCases(prev => [newCase, ...prev]);

            // Notify caller with the created case (e.g. to propagate caseNumber to host)
            onCreated?.(newCase);

            // Screen pop — open the ServiceNow incident in a new tab
            if (newCase.url) window.open(newCase.url, '_blank');

        } catch (e: any) {
            Logger.error('createCase', e);
            setError(e.message || 'Error creating case');
        } finally {
            setCreating(false);
        }
    }

    return { cases, loading, error, creating, createCase };
}

// ── Mock Data (development / offline mode) ────────────────────────

/**
 * Mock incident data keyed by contact identifier.
 * Used when backendUrl is empty (no backend running locally).
 */
const MOCK: Record<string, SnowCase[]> = {
    '+393349089191': [
        { sys_id: 's1', number: 'INC0010234', subject: 'Problema connessione VPN aziendale',
          state: 'In Progress', openedAt: '2026-03-01', assignedTo: 'Marco Bianchi',
          url: 'https://ven07529.service-now.com/incident.do?sys_id=s1' },
        { sys_id: 's2', number: 'INC0009876', subject: 'Richiesta reset password AD',
          state: 'Resolved',    openedAt: '2026-02-14', assignedTo: 'Laura Verdi',
          url: 'https://ven07529.service-now.com/incident.do?sys_id=s2' },
    ],
    'nicola.dirende@softphone.it': [
        { sys_id: 's3', number: 'INC0010198', subject: 'Email non ricevute dominio esterno',
          state: 'In Progress', openedAt: '2026-03-03', assignedTo: 'Marco Bianchi',
          url: 'https://ven07529.service-now.com/incident.do?sys_id=s3' },
    ],
    'mario.rossi@azienda.it': [
        { sys_id: 's4', number: 'INC0010301', subject: 'Accesso negato portale clienti',
          state: 'New',         openedAt: '2026-03-06', assignedTo: 'Unassigned',
          url: 'https://ven07529.service-now.com/incident.do?sys_id=s4' },
    ],
    '393349089191': [
        { sys_id: 's5', number: 'INC0009100', subject: 'Richiesta informazioni prodotto X',
          state: 'Resolved',    openedAt: '2026-01-23', assignedTo: 'Giulia Neri',
          url: 'https://ven07529.service-now.com/incident.do?sys_id=s5' },
    ]
};

function mockCases(contactInfo: string): SnowCase[] {
    return MOCK[contactInfo] || [];
}

