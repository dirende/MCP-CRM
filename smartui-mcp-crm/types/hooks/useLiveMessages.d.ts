import { ChatMessage } from '../models/interfaces/params';
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
export declare function useLiveMessages(interactionId: string, mediaType: string, backendUrl: string): {
    messages: ChatMessage[];
    loading: boolean;
    error: string;
};
