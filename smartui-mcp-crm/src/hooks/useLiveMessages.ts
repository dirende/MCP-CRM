import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../models/interfaces/params';

const POLL_INTERVAL_MS = 3000; // poll every 3 seconds for new messages

/**
 * useLiveMessages — polls the backend for live chat messages during an active interaction.
 *
 * Only fetches when interactionId is set and the mediaType is webmessaging or chat.
 * Polls every 3 seconds and auto-cancels on interactionId change or unmount.
 *
 * @param interactionId - Active Genesys conversation ID
 * @param mediaType     - Channel type (only active for webmessaging/chat)
 * @param backendUrl    - Backend base URL (empty string = mock mode, returns [])
 * @returns { messages, loading, error }
 */
export function useLiveMessages(
    interactionId: string,
    mediaType:     string,
    backendUrl:    string
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState<string | null>(null);

    // Keep a ref to the interval so we can clear it on cleanup
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Only poll for messaging channels
    const isMessaging = mediaType === 'webmessaging' || mediaType === 'chat';

    useEffect(() => {
        // Clear any previous polling interval
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Reset state when interactionId or mediaType changes
        setMessages([]);
        setError(null);

        // Don't poll in mock mode or for non-messaging channels
        if (!backendUrl || !interactionId || !isMessaging) return;

        const abortCtrl = new AbortController();

        const fetchMessages = async () => {
            try {
                const res  = await fetch(
                    `${backendUrl}/api/genesys/messages?interactionId=${encodeURIComponent(interactionId)}`,
                    { signal: abortCtrl.signal }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setMessages(json.messages || []);
                setLoading(false);
                setError(null);
            } catch (e: any) {
                if (e.name === 'AbortError') return; // cleanup — not an error
                setError(e.message);
                setLoading(false);
            }
        };

        // Initial fetch immediately, then poll
        setLoading(true);
        fetchMessages();
        intervalRef.current = setInterval(fetchMessages, POLL_INTERVAL_MS);

        return () => {
            abortCtrl.abort();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [interactionId, mediaType, backendUrl, isMessaging]);

    return { messages, loading, error };
}
