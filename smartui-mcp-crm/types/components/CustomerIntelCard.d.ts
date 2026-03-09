import { CustomerIntel } from '../models/interfaces/params';
interface Props {
    data: CustomerIntel | null;
    loading: boolean;
    error: string | null;
    contactInfo: string;
    mediaType: string;
}
/**
 * CustomerIntelCard — displays AI-analyzed customer intelligence for the active interaction.
 *
 * Shows: customer name, contact info, request type (new/existing case), and a transcript excerpt.
 * The card body is collapsible — click the chevron icon in the header to toggle.
 *
 * Data comes from the useTranscriptAnalysis hook (via App.tsx).
 */
export declare const CustomerIntelCard: ({ data, loading, error, contactInfo, mediaType }: Props) => import("react/jsx-runtime").JSX.Element;
export {};
