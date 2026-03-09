import { GenesysInteraction } from '../models/interfaces/params';
interface Props {
    data: GenesysInteraction[];
    loading: boolean;
    error: string | null;
}
/**
 * InteractionHistoryCard — shows the last 5 Genesys Cloud interactions for the current contact.
 *
 * Displays a compact table with: date/time, channel (with colored badge), duration, and wrapup code.
 * Wrapup codes are resolved from UUIDs to human-readable names by the backend.
 *
 * The card body is collapsible — click the chevron icon in the header to toggle.
 *
 * Data comes from the useGenesysHistory hook (via App.tsx).
 */
export declare const InteractionHistoryCard: ({ data, loading, error }: Props) => import("react/jsx-runtime").JSX.Element;
export {};
