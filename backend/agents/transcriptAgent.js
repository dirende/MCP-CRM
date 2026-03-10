'use strict';

/**
 * TranscriptAgent — Banking helpdesk CRM transcript analysis
 *
 * Analyzes a live conversation transcript and returns structured CustomerIntel:
 *  - Customer name + contact
 *  - Request type (new_case / existing_case / check_status / close_case / unknown)
 *  - Case number if mentioned (INC/CHG/REQ/RITM), zero-padded to 7 digits
 *  - requestSummary: short Italian label of the customer's request
 *  - agentSuggestion: short action hint for the agent
 *  - aiEngine: 'claude' | 'gemini' | 'heuristic'
 *
 * Fallback chain:
 *  1. Claude AI (haiku) — if ANTHROPIC_API_KEY configured
 *  2. Google Gemini (gemini-2.5-flash) — if GEMINI_API_KEY configured
 *  3. Regex heuristic — always available
 */
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Prompts ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `### ROLE
Sei l'analista AI in tempo reale per l'Helpdesk Bancario su ServiceNow. Il tuo compito è monitorare il transcript e popolare i metadati del CRM.

### CONTESTO TECNICO
- **Dominio:** Home Banking, 2FA, Pagamenti, Carte, Conti Correnti.
- **Pattern Ticket:** INC\\d+, CHG\\d+, REQ\\d+, RITM\\d+ (es. INC0012345).

### LOGICA DI CLASSIFICAZIONE (requestType)
- \`new_case\`: Segnalazione di un nuovo problema tecnico o blocco.
- \`existing_case\`: Riferimento esplicito a un ticket già aperto.
- \`check_status\`: Richiesta specifica di aggiornamenti su tempistiche/stato.
- \`close_case\`: Conferma di risoluzione o richiesta di chiusura pratica.
- \`unknown\`: Informazioni insufficienti o saluti iniziali.

### VINCOLI DI OUTPUT
Restituisci esclusivamente un oggetto JSON con queste chiavi:
- "customerName": Nome del cliente (null se non rilevato)
- "contact": Email o telefono (null se non rilevato)
- "requestType": Una delle categorie sopra indicate
- "caseNumber": Estratto dal testo (null se non presente)
- "requestSummary": Max 5 parole in italiano (es. "Blocco accesso app 2FA")
- "agentSuggestion": Azione consigliata all'agente (Max 90 caratteri).

### JSON STRUCTURE
{
  "customerName": "string|null",
  "contact": "string|null",
  "requestType": "string",
  "caseNumber": "string|null",
  "requestSummary": "string",
  "agentSuggestion": "string"
}`;

const CLOSING_PROMPT = `### ROLE
Sei un esperto di Documentazione Tecnica Helpdesk. Il tuo obiettivo è sintetizzare la sessione di supporto per il record ServiceNow.

### ISTRUZIONI DI SINTESI
Analizza il transcript completo e produci un riepilogo che segua questo schema logico:
1. **Problema:** Motivo del contatto.
2. **Azioni:** Troubleshooting eseguito dall'agente.
3. **Esito:** Risoluzione, escalation o stato attuale.
4. **Next Steps:** Task residui.

### REQUISITI DI FORMATTAZIONE
- Lingua: Italiano professionale.
- Lunghezza Summary: 5-10 righe.
- Output richiesto: JSON puro.

### REGOLA CRITICA
- Il caseNumber DEVE includere SEMPRE il prefisso completo (INC, CHG, REQ, RITM) seguito da 7 cifre con zero-padding.
- Esempio CORRETTO: "INC0010363" — Esempio ERRATO: "10363" o "INC10363".

### JSON STRUCTURE
{
  "caseNumber": "INC0012345 (null se non trovato nel transcript)",
  "summary": "SINTESI STRUTTURATA:\\n- PROBLEMA: ...\\n- AZIONI: ...\\n- ESITO: ...\\n- PROSSIMI PASSI: ..."
}`;

// ── Per-interaction analysis cache ────────────────────────────────
//
// Stores the last analysis result + transcript text per interactionId.
// Used by close-interaction to retrieve transcript/caseNumber at Mark Done time
// even if the message buffer has been cleared.

const _analysisCache = new Map(); // interactionId → { intel, transcriptText, ts }

const CACHE_TTL_MS = 7_200_000; // 2 hours

function cacheAnalysis(interactionId, intel, transcriptText) {
    if (!interactionId) return;
    _analysisCache.set(interactionId, { intel, transcriptText: transcriptText || '', ts: Date.now() });
    // Prune entries older than 2 hours
    const cutoff = Date.now() - CACHE_TTL_MS;
    for (const [key, val] of _analysisCache.entries()) {
        if (val.ts < cutoff) _analysisCache.delete(key);
    }
}

function getCachedAnalysis(interactionId) {
    return _analysisCache.get(interactionId) || null;
}

function clearCachedAnalysis(interactionId) {
    _analysisCache.delete(interactionId);
}

// ── Shared AI Utilities ────────────────────────────────────────────

/**
 * Extracts the first JSON object from an AI response string.
 * Returns {} on parse failure to avoid crashing callers.
 */
function parseAiJson(raw) {
    try {
        const match = (raw || '').match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : {};
    } catch {
        return {};
    }
}

/**
 * Calls Claude (haiku) with a system + user prompt and returns parsed JSON.
 * @param {string} system
 * @param {string} user
 * @param {number} maxTokens
 */
async function callClaude(system, user, maxTokens = 512) {
    const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg    = await client.messages.create({
        model:    'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }]
    });
    return parseAiJson(msg.content[0]?.text?.trim());
}

/**
 * Calls Gemini (2.5-flash) with a full prompt and returns parsed JSON.
 * @param {string} prompt
 */
async function callGemini(prompt) {
    const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return parseAiJson(result.response.text().trim());
}

/**
 * Normalizes a ServiceNow ticket number to the canonical 7-digit zero-padded format.
 * "INC10363" → "INC0010363" | "10363" → "INC0010363" | null → null
 */
function normalizeTicketNumber(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    // Already prefixed: INC10363 → INC0010363
    const prefixed = s.match(/^(INC|CHG|REQ|RITM)(\d+)$/i);
    if (prefixed) return `${prefixed[1].toUpperCase()}${prefixed[2].padStart(7, '0')}`;
    // Digits-only (AI omitted prefix): 10363 → INC0010363
    const digitsOnly = s.match(/^(\d{5,})$/);
    if (digitsOnly) return `INC${digitsOnly[1].padStart(7, '0')}`;
    return s.toUpperCase();
}

/**
 * Builds a normalized CustomerIntel object from raw AI-parsed fields.
 * Single source of truth for the output shape — used by all extraction paths.
 */
function buildIntel(parsed, contactInfo, engine) {
    return {
        customerName:    parsed.customerName    || null,
        contact:         parsed.contact         || contactInfo,
        requestType:     parsed.requestType     || 'unknown',
        caseNumber:      normalizeTicketNumber(parsed.caseNumber),
        requestSummary:  parsed.requestSummary  || null,
        agentSuggestion: parsed.agentSuggestion || null,
        aiEngine:        engine
    };
}

// ── Main Entry Point ───────────────────────────────────────────────

/**
 * Analyzes a conversation transcript and returns CustomerIntel.
 *
 * @param {string} transcriptText - Full formatted conversation text
 * @param {string} contactInfo    - Known customer contact (phone/email) as fallback
 * @returns {Promise<Object>} CustomerIntel object
 */
async function analyzeTranscript(transcriptText, contactInfo) {
    if (!transcriptText || transcriptText.trim().length < 10) {
        return buildIntel({}, contactInfo, 'heuristic');
    }
    return extractIntel(transcriptText, contactInfo);
}

// ── Intel Extraction ───────────────────────────────────────────────

async function extractIntel(text, contactInfo) {
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const parsed = await callClaude(SYSTEM_PROMPT, `Conversazione da analizzare:\n\n${text}`);
            console.log(`[TranscriptAgent] Claude → ${parsed.requestType} | ${parsed.customerName} | ${parsed.requestSummary}`);
            return buildIntel(parsed, contactInfo, 'claude');
        } catch (e) {
            console.error('[TranscriptAgent] Claude error:', e.message);
        }
    }

    if (process.env.GEMINI_API_KEY) {
        try {
            const parsed = await callGemini(`${SYSTEM_PROMPT}\n\nConversazione da analizzare:\n\n${text}`);
            console.log(`[TranscriptAgent] Gemini → ${parsed.requestType} | ${parsed.customerName} | ${parsed.requestSummary}`);
            return buildIntel(parsed, contactInfo, 'gemini');
        } catch (e) {
            console.error('[TranscriptAgent] Gemini error:', e.message);
        }
    }

    console.warn('[TranscriptAgent] No AI available — using heuristic');
    return heuristicAnalysis(text, contactInfo);
}

// ── Heuristic Fallback ────────────────────────────────────────────

function heuristicAnalysis(text, contactInfo) {
    const lower      = text.toLowerCase();
    const caseMatch  = text.match(/\b(INC|CHG|REQ|RITM)\d{5,}\b/i);
    const caseNumber = caseMatch ? normalizeTicketNumber(caseMatch[0]) : null;

    let requestType = 'unknown';
    if (caseNumber) {
        if (lower.includes('chius') || lower.includes('risolto') || lower.includes('risolvere') ||
            lower.includes('possiamo chiudere') || lower.includes('chiudiamo') || lower.includes('mark done')) {
            requestType = 'close_case';
        } else if (lower.includes('stato') || lower.includes('come procede') ||
                   lower.includes('aggiornamento') || lower.includes('novità') ||
                   lower.includes('quando') || lower.includes('notizie')) {
            requestType = 'check_status';
        } else {
            requestType = 'existing_case';
        }
    } else if (lower.includes('vecchio') || lower.includes('esistente') ||
               lower.includes('già aperto') || lower.includes('ticket aperto')) {
        requestType = 'existing_case';
    } else if (lower.includes('nuovo') || lower.includes('aprir') ||
               lower.includes('creare') || lower.includes('segnalar') ||
               lower.includes('non funziona') || lower.includes('bloccato') ||
               lower.includes('problema') || lower.includes('errore')) {
        requestType = 'new_case';
    }

    const nameMatch       = text.match(/(?:sono|mi chiamo|cliente[:\s]+)([A-Z][a-z]+ [A-Z][a-z]+)/);
    const agentSuggestion =
        requestType === 'new_case'      ? 'Aprire nuovo INC su ServiceNow' :
        requestType === 'existing_case' ? 'Ricercare ticket esistente su ServiceNow' :
        requestType === 'check_status'  ? `Verificare stato ${caseNumber || 'ticket'} in ServiceNow` :
        requestType === 'close_case'    ? `Chiudere ${caseNumber || 'ticket'} in ServiceNow` :
        null;

    return buildIntel({
        customerName: nameMatch ? nameMatch[1] : null,
        requestType, caseNumber, agentSuggestion
    }, contactInfo, 'heuristic');
}

// ── Closing Summary (Mark Done) ────────────────────────────────────

/**
 * Generates a closing summary for ServiceNow when an interaction ends (mark done).
 * Tries Claude → Gemini → plain text fallback.
 *
 * @param {string} transcriptText - Full formatted conversation
 * @param {string} contactInfo    - Customer contact (phone/email)
 * @returns {Promise<{summary: string, caseNumber: string|null}>}
 */
async function generateClosingSummary(transcriptText, contactInfo) {
    if (!transcriptText || transcriptText.trim().length < 10) {
        return { summary: `Interazione con ${contactInfo} — nessun transcript disponibile.`, caseNumber: null };
    }

    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const parsed = await callClaude(CLOSING_PROMPT, `Transcript:\n\n${transcriptText}`, 1024);
            if (parsed.summary) {
                console.log(`[TranscriptAgent] Closing summary via Claude (${parsed.summary.length} chars)`);
                return { summary: parsed.summary, caseNumber: normalizeTicketNumber(parsed.caseNumber) };
            }
        } catch (e) {
            console.error('[TranscriptAgent] Claude closing summary error:', e.message);
        }
    }

    if (process.env.GEMINI_API_KEY) {
        try {
            const parsed = await callGemini(`${CLOSING_PROMPT}\n\nTranscript:\n\n${transcriptText}`);
            if (parsed.summary) {
                console.log(`[TranscriptAgent] Closing summary via Gemini (${parsed.summary.length} chars)`);
                return { summary: parsed.summary, caseNumber: normalizeTicketNumber(parsed.caseNumber) };
            }
        } catch (e) {
            console.error('[TranscriptAgent] Gemini closing summary error:', e.message);
        }
    }

    // Plain text fallback — no AI available
    const caseMatch = transcriptText.match(/\b(INC|CHG|REQ|RITM)\d{5,}\b/i);
    const summary   = `Riepilogo automatico — AI non disponibile.\nContatto: ${contactInfo}\nTranscript:\n${transcriptText.slice(0, 2000)}`;
    return { summary, caseNumber: caseMatch ? normalizeTicketNumber(caseMatch[0]) : null };
}

module.exports = { analyzeTranscript, generateClosingSummary, cacheAnalysis, getCachedAnalysis, clearCachedAnalysis };
