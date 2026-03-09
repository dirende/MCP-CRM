'use strict';

/**
 * TranscriptAgent — Transcript analysis via Claude AI
 *
 * Analyzes a conversation transcript and returns structured CustomerIntel:
 *  - Customer name
 *  - Contact information (phone or email)
 *  - Request type (new_case / existing_case / unknown)
 *  - Case number if mentioned
 *  - A short excerpt summarizing the customer's issue
 *
 * Fallback chain (in order):
 *  1. Claude AI (claude-haiku) — if ANTHROPIC_API_KEY is configured
 *  2. Regex / heuristic analysis — if no API key (fast, no cost, lower accuracy)
 *  3. Empty intel object — if transcript is missing or too short
 */
const Anthropic = require('@anthropic-ai/sdk');

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
 * @returns {Promise<Object>} CustomerIntel object
 */
async function analyzeTranscript(transcriptText, contactInfo) {

    // Guard: if the transcript is empty or too short, skip analysis
    if (!transcriptText || transcriptText.trim().length < 10) {
        return fallbackIntel(contactInfo, transcriptText);
    }

    // No API key configured — use the free heuristic approach
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('[TranscriptAgent] ANTHROPIC_API_KEY not configured — using heuristic fallback');
        return heuristicAnalysis(transcriptText, contactInfo);
    }

    // Claude AI analysis
    try {
        const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const message = await client.messages.create({
            model:      'claude-haiku-4-5-20251001', // Haiku: fast and cheap for structured extraction
            max_tokens: 512,
            system:     SYSTEM_PROMPT,
            messages:   [{ role: 'user', content: `Transcript:\n\n${transcriptText}` }]
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
            excerpt:      parsed.excerpt      || transcriptText.slice(0, 200)
        };

    } catch (e) {
        console.error('[TranscriptAgent] Claude error:', e.message);
        return heuristicAnalysis(transcriptText, contactInfo); // graceful degradation
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
