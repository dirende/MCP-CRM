'use strict';

/**
 * TranscriptAgent — Transcript analysis via Claude AI + Google Gemini
 *
 * Analyzes a conversation transcript and returns structured CustomerIntel:
 *  - Customer name
 *  - Contact information (phone or email)
 *  - Request type (new_case / existing_case / unknown)
 *  - Case number if mentioned
 *  - A short excerpt summarizing the customer's issue
 *  - requestSummary: 3-4 word Italian label of the customer's request (via Gemini)
 *
 * Fallback chain (in order):
 *  1. Claude AI (claude-haiku) — if ANTHROPIC_API_KEY is configured
 *  2. Regex / heuristic analysis — if no API key (fast, no cost, lower accuracy)
 *  3. Empty intel object — if transcript is missing or too short
 *
 * requestSummary fallback chain:
 *  1. Google Gemini (gemini-2.0-flash) — if GEMINI_API_KEY is configured
 *  2. null — if no key or Gemini call fails
 */
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// System prompt for Claude — written in Italian to match the transcript language.
// The model is instructed to return ONLY valid JSON with no extra text.
const SYSTEM_PROMPT = `Sei un assistente CRM specializzato nell'analisi di transcript di conversazioni con clienti.
Analizza il testo fornito ed estrai le seguenti informazioni in formato JSON:
{
  "customerName": "nome completo del cliente (o null se non trovato)",
  "contact": "telefono o email del cliente (o null)",
  "requestType": "new_case | existing_case | unknown",
  "caseNumber": "numero case se menzionato (es. INC0010234, o null)",
  "excerpt": "frase chiave che descrive il problema del cliente (max 200 caratteri)"
}
Rispondi SOLO con il JSON, senza testo aggiuntivo.`;

// ── Main Entry Point ──────────────────────────────────────────────

/**
 * Analyzes a conversation transcript and returns CustomerIntel.
 *
 * @param {string} transcriptText - Full text of the conversation transcript
 * @param {string} contactInfo    - Known customer contact (phone/email) used as fallback
 * @returns {Promise<Object>} CustomerIntel object (includes requestSummary from Gemini)
 */
async function analyzeTranscript(transcriptText, contactInfo) {

    // Guard: if the transcript is empty or too short, skip analysis
    if (!transcriptText || transcriptText.trim().length < 10) {
        return fallbackIntel(contactInfo, transcriptText);
    }

    // Run structured extraction (Claude or heuristic) and Gemini summary in parallel
    const [intel, requestSummary] = await Promise.all([
        extractIntel(transcriptText, contactInfo),
        geminiSummarize(transcriptText)
    ]);

    return { ...intel, requestSummary };
}

/**
 * Extracts structured CustomerIntel fields from the transcript.
 * Uses Claude AI if key is available, heuristic regex otherwise.
 *
 * @param {string} text        - Transcript text
 * @param {string} contactInfo - Known contact for fallback
 * @returns {Promise<Object>} CustomerIntel without requestSummary
 */
async function extractIntel(text, contactInfo) {
    // No API key configured — use the free heuristic approach
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('[TranscriptAgent] ANTHROPIC_API_KEY not configured — using heuristic fallback');
        return heuristicAnalysis(text, contactInfo);
    }

    // Claude AI analysis
    try {
        const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const message = await client.messages.create({
            model:      'claude-haiku-4-5-20251001', // Haiku: fast and cheap for structured extraction
            max_tokens: 512,
            system:     SYSTEM_PROMPT,
            messages:   [{ role: 'user', content: `Transcript:\n\n${text}` }]
        });

        const raw = message.content[0]?.text?.trim() || '{}';

        // Use a regex to extract the JSON block in case Claude adds any surrounding text
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        return {
            customerName: parsed.customerName || null,
            contact:      parsed.contact      || contactInfo,
            requestType:  parsed.requestType  || 'unknown',
            caseNumber:   parsed.caseNumber   || null,
            excerpt:      parsed.excerpt      || text.slice(0, 200)
        };

    } catch (e) {
        console.error('[TranscriptAgent] Claude error:', e.message);
        return heuristicAnalysis(text, contactInfo); // graceful degradation
    }
}

/**
 * Calls Google Gemini to produce a concise 3-4 word Italian label
 * describing the customer's main request (e.g. "problema fattura non pagata").
 *
 * Returns null if GEMINI_API_KEY is not set or the call fails.
 *
 * @param {string} text - Transcript text
 * @returns {Promise<string|null>}
 */
async function geminiSummarize(text) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('[TranscriptAgent] GEMINI_API_KEY not configured — requestSummary will be null');
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt =
            `Leggi il seguente transcript di una conversazione con un cliente e rispondi con ` +
            `SOLE 3-4 parole in italiano che descrivono sinteticamente la richiesta principale del cliente. ` +
            `Niente punteggiatura, niente frasi complete. Solo le parole chiave.\n\nTranscript:\n${text}`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text().trim().slice(0, 60); // max 60 chars safety cap
        console.log(`[TranscriptAgent] Gemini requestSummary: "${summary}"`);
        return summary || null;

    } catch (e) {
        console.error('[TranscriptAgent] Gemini error:', e.message);
        return null;
    }
}

// ── Heuristic Fallback ────────────────────────────────────────────

/**
 * Simple regex-based transcript analysis used when Claude AI is unavailable.
 * Less accurate than AI but requires no API calls and works fully offline.
 *
 * @param {string} text        - Transcript text
 * @param {string} contactInfo - Known contact (used as fallback for contact field)
 * @returns {Object} CustomerIntel object
 */
function heuristicAnalysis(text, contactInfo) {
    const lower = text.toLowerCase();

    // Look for a ServiceNow-style ticket number (INC, CHG, REQ, RITM + 7+ digits)
    const caseMatch  = text.match(/\b(INC|CHG|REQ|RITM)\d{7,}\b/i);
    const caseNumber = caseMatch ? caseMatch[0].toUpperCase() : null;

    // Determine request type from Italian keywords
    let requestType = 'unknown';
    if (caseNumber || lower.includes('vecchio') || lower.includes('esistente') ||
        lower.includes('aggiornamento') || lower.includes('stato del')) {
        requestType = 'existing_case';
    } else if (lower.includes('nuovo') || lower.includes('aprir') ||
               lower.includes('creare') || lower.includes('segnalar')) {
        requestType = 'new_case';
    }

    // Look for a full name after common Italian introduction phrases
    const nameMatch    = text.match(/(?:sono|mi chiamo|cliente[:\s]+)([A-Z][a-z]+ [A-Z][a-z]+)/);
    const customerName = nameMatch ? nameMatch[1] : null;

    // Use the first meaningful line as the excerpt (skip very short lines)
    const firstLine = text.split('\n').find(l => l.trim().length > 20) || '';
    const excerpt   = firstLine.slice(0, 200);

    return { customerName, contact: contactInfo, requestType, caseNumber, excerpt };
}

/**
 * Returns a minimal CustomerIntel object when no transcript is available.
 * Preserves the contactInfo as the only known data point.
 */
function fallbackIntel(contactInfo, transcript) {
    return {
        customerName: null,
        contact:      contactInfo,
        requestType:  'unknown',
        caseNumber:   null,
        excerpt:      transcript ? transcript.slice(0, 200) : null
    };
}

module.exports = { analyzeTranscript };
