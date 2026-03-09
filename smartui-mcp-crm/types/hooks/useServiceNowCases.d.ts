import { SnowCase } from '../models/interfaces/params';
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
export declare function useServiceNowCases(contactInfo: string, backendUrl: string): {
    cases: SnowCase[];
    loading: boolean;
    error: string;
    creating: boolean;
    createCase: (contactInfoArg: string, interactionId: string) => Promise<void>;
};
