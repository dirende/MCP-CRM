import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Stack } from '@mui/material';
import { Params } from './models/interfaces/params';
import { Logger } from './utils/Logger';
import { CloseBar } from './components/CloseBar';
import { CustomerIntelCard } from './components/CustomerIntelCard';
import { InteractionHistoryCard } from './components/InteractionHistoryCard';
import { ServiceNowCard } from './components/ServiceNowCard';
import { LiveChatCard } from './components/LiveChatCard';
import { useTranscriptAnalysis } from './hooks/useTranscriptAnalysis';
import { useGenesysHistory } from './hooks/useGenesysHistory';
import { useServiceNowCases } from './hooks/useServiceNowCases';
import { useLiveMessages } from './hooks/useLiveMessages';

// pClient is injected at runtime by the Genesys PEF (Partner Extension Framework)
// and declared as a global in index.d.ts. It provides the CTI messaging bridge.
declare var pClient: any;

interface AppProps {
    ctiMessage: CtiMessage | undefined;
    params:     Params;
    id:         string;
}

// ── Contact Extraction ────────────────────────────────────────────

/**
 * Extracts the primary contact identifier (phone or email) from a CTI message.
 *
 * The extraction logic differs per media type:
 *  - voice:          ANI (caller) for inbound, DNIS (dialed number) for outbound
 *  - email:          email address from attachdata or ANI
 *  - webmessaging / chat: email from attachdata context fields
 *  - whatsapp / sms: phone number from ANI (stripped of "tel:" prefix)
 *
 * Returns an empty string if the message is undefined or no contact is found.
 */
function extractContactInfo(msg: CtiMessage | undefined): string {
    if (!msg) return '';
    const att = msg.attachdata || {};

    switch (msg.MediaType) {
        case 'voice':
            // Outbound: we dialed the customer → use DNIS; Inbound: customer called → use ANI
            return msg.CallType === 'Outbound'
                ? (msg.DNIS || '').replace('tel:', '')
                : (msg.ANI  || '').replace('tel:', '');

        case 'email':
            return att['email'] || att['emailaddress'] || msg.ANI || '';

        case 'webmessaging':
        case 'chat':
            // Context fields (prefixed with "context.") are populated by chat widgets
            return att['context.email'] || att['email'] || att['emailaddress'] || msg.ANI || '';

        case 'whatsapp':
        case 'sms':
            return (msg.ANI || '').replace('tel:', '');

        default:
            return att['email'] || att['emailaddress'] || msg.ANI || '';
    }
}

// ── Root Component ────────────────────────────────────────────────

/**
 * App — root component of the MCP-CRM SmartUI widget.
 *
 * Rendered inside the Genesys PEF when a new interaction arrives.
 * Coordinates three data hooks and renders the card-based UI.
 *
 * Props:
 *  - ctiMessage: the active CTI event (undefined = no active interaction)
 *  - params:     configuration injected by the PEF host (backendUrl, title, etc.)
 *  - id:         DOM element ID where the widget is mounted
 */
function App({ ctiMessage, params, id }: AppProps) {
    const backendUrl = params?.backendUrl || '';

    // Memoize contactInfo so hooks only re-run when the actual value changes
    const contactInfo  = useMemo(() => extractContactInfo(ctiMessage), [ctiMessage]);
    const interactionId = ctiMessage?.InteractionID || '';

    Logger.log('App', { contactInfo, interactionId, mediaType: ctiMessage?.MediaType });

    // ── Data Hooks ────────────────────────────────────────────────
    // Each hook manages its own loading/error state and fetches from the backend.
    // They automatically re-fetch whenever contactInfo or backendUrl changes.

    const { data: history, loading: histLoading, error: histError } =
        useGenesysHistory(contactInfo, backendUrl);

    const { cases, loading: casesLoading, error: casesError, createCase, creating } =
        useServiceNowCases(contactInfo, backendUrl);

    // Live chat messages — only active for webmessaging/chat channels
    const mediaType = ctiMessage?.MediaType || '';
    const { messages: liveMessages, loading: liveLoading, error: liveError } =
        useLiveMessages(interactionId, mediaType, backendUrl);

    // Re-analyze on every new message — AbortController cancels in-flight calls automatically
    const { data: intel, loading: intelLoading, error: intelError } =
        useTranscriptAnalysis(interactionId, contactInfo, backendUrl, liveMessages.length);

    // ── Intel update callback ─────────────────────────────────────
    // Notify the host page whenever the AI analysis changes so it can
    // read the current caseNumber for Mark Done / close-interaction.

    useEffect(() => {
        if (intel && params?.onIntelUpdate) {
            params.onIntelUpdate(intel);
        }
    }, [intel]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Create Case handler ───────────────────────────────────────
    // Wraps createCase to pass the AI requestSummary as short_description,
    // and propagates the newly created caseNumber to the host via onIntelUpdate.

    const handleCreateCase = useCallback(async (ci: string, iid: string) => {
        await createCase(ci, iid, intel?.requestSummary || undefined, (newCase) => {
            if (params?.onIntelUpdate && intel) {
                params.onIntelUpdate({ ...intel, caseNumber: newCase.number });
            }
        });
    }, [createCase, intel, params]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── onOpen Callback ───────────────────────────────────────────

    const handleOpen = useCallback(() => {
        if (params?.onOpen) params.onOpen(params);
    }, [params]);

    useEffect(() => {
        handleOpen();
    }, [handleOpen]);

    // ── Interaction End Cleanup ───────────────────────────────────
    // When the interaction ends (interactionId becomes empty), clear the
    // backend message buffer so stale messages don't persist for the next session.

    const prevInteractionId = useRef(interactionId);
    useEffect(() => {
        const prev = prevInteractionId.current;
        prevInteractionId.current = interactionId;
        // Interaction ended: had an ID, now empty
        if (prev && !interactionId && backendUrl) {
            fetch(`${backendUrl}/api/genesys/messages/${encodeURIComponent(prev)}`, { method: 'DELETE' })
                .catch(() => {}); // fire-and-forget — non-critical
        }
    }, [interactionId, backendUrl]);

    // ── No Active Interaction ─────────────────────────────────────

    if (!ctiMessage) {
        return (
            <Stack
                height="100%" width="100%"
                alignItems="center" justifyContent="center"
                sx={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.8rem', gap: 1 }}
            >
                <span style={{ fontSize: '2rem', opacity: 0.3 }}>🎧</span>
                <span>Waiting for interaction...</span>
            </Stack>
        );
    }

    // ── Main Layout ───────────────────────────────────────────────

    return (
        <Stack
            height="100%" width="100%"
            direction="column"
            overflow="hidden"
            sx={{ background: '#0f172a' }}
        >
            {/* Optional sticky header — hidden if headerHidden param is set */}
            {!params?.headerHidden && (
                <CloseBar
                    title={params?.title || 'MCP-CRM Integration'}
                    backgroundColor={params?.headerColor     || '#0c1524'}
                    color={params?.headerTextColor || '#e2e8f0'}
                    onClose={params?.onClose}
                    onReset={params?.onReset}
                />
            )}

            {/* Scrollable card area — each card shows one integration domain */}
            <Stack
                flex={1}
                overflow="auto"
                direction="column"
                gap="8px"
                padding="10px"
                sx={{ '&::-webkit-scrollbar': { width: '4px' } }}
            >
                {/* Live Chat — real-time message bubbles (webmessaging/chat only) */}
                {(mediaType === 'webmessaging' || mediaType === 'chat') && (
                    <LiveChatCard
                        messages={liveMessages}
                        loading={liveLoading}
                        error={liveError}
                        mediaType={mediaType}
                    />
                )}

                {/* Customer Intelligence — transcript analysis via Claude AI + Gemini */}
                {/* customerName: prefer Claude extraction, fallback to ServiceNow caller_id */}
                <CustomerIntelCard
                    data={intel ? {
                        ...intel,
                        customerName: intel.customerName || cases?.[0]?.callerName || null
                    } : null}
                    loading={intelLoading}
                    error={intelError}
                    contactInfo={contactInfo}
                    mediaType={mediaType}
                    caseUrl={
                        // 1. Exact match from ServiceNow list
                        cases?.find(c => c.number === intel?.caseNumber)?.url ||
                        // 2. AI-extracted case number → ServiceNow list search
                        (intel?.caseNumber ? `https://ven07529.service-now.com/incident_list.do?sysparm_query=number=${intel.caseNumber}` : undefined) ||
                        // 3. For close/existing/check with no case number → first open case in list
                        ((intel?.requestType === 'close_case' || intel?.requestType === 'existing_case' || intel?.requestType === 'check_status') && cases?.[0]?.url
                            ? cases[0].url
                            : undefined)
                    }
                    onCreateCase={() => handleCreateCase(contactInfo, interactionId)}
                />

                {/* Interaction History — last 5 interactions from Genesys Cloud */}
                <InteractionHistoryCard
                    data={history}
                    loading={histLoading}
                    error={histError}
                />

                {/* ServiceNow Cases — last 3 incidents + option to create a new one */}
                <ServiceNowCard
                    cases={cases}
                    loading={casesLoading}
                    error={casesError}
                    creating={creating}
                    contactInfo={contactInfo}
                    interactionId={interactionId}
                    onCreateCase={handleCreateCase}
                />
            </Stack>
        </Stack>
    );
}

export default App;
