import { MouseEventHandler } from 'react';
export interface Params {
    /** URL del backend MCP-CRM (es. http://localhost:3000) */
    backendUrl?: string;
    /** Callback chiusura view */
    onClose?: MouseEventHandler<HTMLButtonElement>;
    /** Callback apertura view */
    onOpen?: ((args: Params) => void | boolean) | ((args: Params) => Promise<void | boolean>);
    /** Titolo mostrato nella CloseBar */
    title?: string;
    /** Nasconde la CloseBar */
    headerHidden?: boolean;
    /** Colore sfondo header */
    headerColor?: string;
    /** Colore testo header */
    headerTextColor?: string;
}
/** Dati estratti dall'analisi del transcript */
export interface CustomerIntel {
    customerName: string;
    contact: string;
    requestType: 'new_case' | 'existing_case' | 'unknown';
    caseNumber?: string;
    caseDate?: string;
    excerpt?: string;
    /** 3-4 word Italian summary of the customer's request, produced by Google Gemini */
    requestSummary?: string;
    /** AI engine that produced the analysis: 'claude' | 'gemini' | 'heuristic' */
    aiEngine?: string;
}
/** Single message in a live webmessaging/chat conversation */
export interface ChatMessage {
    id: string;
    body: string;
    direction: 'inbound' | 'outbound';
    timestamp: string;
    sender: string;
}
/** Singola interazione storica Genesys */
export interface GenesysInteraction {
    id: string;
    startTime: string;
    mediaType: string;
    duration: string;
    wrapup: string;
    direction: string;
}
/** Singolo case ServiceNow */
export interface SnowCase {
    sys_id: string;
    number: string;
    subject: string;
    state: string;
    openedAt: string;
    assignedTo: string;
    callerName?: string | null;
    url?: string;
}
