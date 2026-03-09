import { SnowCase } from '../models/interfaces/params';
interface Props {
    cases: SnowCase[];
    loading: boolean;
    error: string | null;
    creating: boolean;
    contactInfo: string;
    interactionId: string;
    onCreateCase: (contactInfo: string, interactionId: string) => Promise<void>;
}
/**
 * ServiceNowCard — shows the last 3 ServiceNow incidents for the current contact,
 * and provides a button to create a new incident directly from the SmartUI.
 *
 * Each incident row shows: number, description, status badge, and a link to open it in ServiceNow.
 * Creating a new case triggers a screen pop (opens the new incident URL in a new tab).
 *
 * The card body is collapsible — click the chevron icon in the header to toggle.
 *
 * Data comes from the useServiceNowCases hook (via App.tsx).
 */
export declare const ServiceNowCard: ({ cases, loading, error, creating, contactInfo, interactionId, onCreateCase }: Props) => import("react/jsx-runtime").JSX.Element;
export {};
