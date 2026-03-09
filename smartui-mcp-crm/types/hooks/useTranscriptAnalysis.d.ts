import { CustomerIntel } from '../models/interfaces/params';
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
export declare function useTranscriptAnalysis(interactionId: string, contactInfo: string, backendUrl: string, hasMessages?: boolean): {
    data: CustomerIntel;
    loading: boolean;
    error: string;
};
