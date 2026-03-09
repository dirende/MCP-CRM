import { ChatMessage } from '../models/interfaces/params';
interface Props {
    messages: ChatMessage[];
    loading: boolean;
    error: string | null;
    mediaType: string;
}
/**
 * LiveChatCard — shows the live conversation messages for an active webmessaging/chat interaction.
 *
 * Polls the backend every 3 seconds (via useLiveMessages hook in App.tsx).
 * Messages are displayed as chat bubbles: customer (left) vs agent (right).
 * The card auto-scrolls to the newest message when new ones arrive.
 *
 * Only rendered when mediaType is 'webmessaging' or 'chat'.
 */
export declare const LiveChatCard: ({ messages, loading, error, mediaType }: Props) => import("react/jsx-runtime").JSX.Element;
export {};
