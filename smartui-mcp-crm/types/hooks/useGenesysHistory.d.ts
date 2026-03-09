import { GenesysInteraction } from '../models/interfaces/params';
/**
 * useGenesysHistory — fetches the last 5 interactions for a contact from Genesys Cloud.
 *
 * Calls: GET /api/genesys/history?contactInfo=<phone|email>
 *
 * Features:
 *  - Automatically cancels in-flight requests when contactInfo changes (AbortController)
 *  - Falls back to mock data when backendUrl is empty (local development mode)
 *  - Re-fetches automatically whenever contactInfo or backendUrl changes
 *
 * @param contactInfo - Customer phone number or email address
 * @param backendUrl  - Backend base URL (e.g. "http://localhost:3000"). Empty = use mock data.
 * @returns { data, loading, error }
 */
export declare function useGenesysHistory(contactInfo: string, backendUrl: string): {
    data: GenesysInteraction[];
    loading: boolean;
    error: string;
};
