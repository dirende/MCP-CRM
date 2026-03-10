'use strict';

/**
 * Route: /api/servicenow
 *
 * Exposes ServiceNow incident management to the SmartUI frontend.
 */
const express    = require('express');
const router     = express.Router();
const snow       = require('../agents/servicenowAgent');
const transcript = require('../agents/transcriptAgent');
const { getLiveMessages, clearBuffer } = require('../agents/notificationsAgent');

/**
 * GET /api/servicenow/cases?contactInfo=<phone|email>
 *
 * Returns the most recent ServiceNow incidents for the given contact,
 * limited to the last 3 results (sliced from up to 10 fetched).
 *
 * Response: { cases: SnowCase[] }
 * Each case: { sys_id, number, subject, state, openedAt, assignedTo, url }
 */
router.get('/cases', async (req, res) => {
    const { contactInfo } = req.query;
    if (!contactInfo) return res.status(400).json({ error: 'contactInfo is required' });

    try {
        const all   = await snow.getCases(contactInfo);
        const cases = all.slice(0, 3); // show only the 3 most recent incidents
        console.log(`[servicenow] cases ${contactInfo} → ${cases.length} incidents`);
        res.json({ cases });
    } catch (e) {
        console.error('[servicenow] getCases error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/servicenow/cases
 *
 * Creates a new ServiceNow incident for the given contact.
 * Typically triggered when an agent clicks "+ Create new case" in the SmartUI.
 *
 * Request body: { contactInfo, interactionId, short_description?, category? }
 * Response:     SnowCase (includes url for screen pop — opens in new tab on the client)
 */
router.post('/cases', async (req, res) => {
    const { contactInfo, interactionId, short_description, category } = req.body;
    if (!contactInfo) return res.status(400).json({ error: 'contactInfo is required' });

    try {
        const newCase = await snow.createCase({ contactInfo, interactionId, short_description, category });
        console.log(`[servicenow] case created: ${newCase.number} for ${contactInfo}`);
        res.json(newCase);
    } catch (e) {
        console.error('[servicenow] createCase error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/servicenow/close-interaction
 *
 * Called on Mark Done — updates the ServiceNow incident with the full conversation
 * transcript and an AI-generated summary, then clears the message buffer.
 *
 * Request body: { interactionId, caseNumber?, contactInfo }
 *  - interactionId: Genesys conversation ID (used to fetch the buffered messages)
 *  - caseNumber:    INC/CHG/REQ/RITM number to update (optional — AI will try to extract from transcript)
 *  - contactInfo:   Customer phone or email (fallback for context)
 *
 * Response: { ok: true, caseNumber, sys_id } | { ok: false, reason }
 */
router.post('/close-interaction', async (req, res) => {
    const { interactionId, caseNumber: providedCase, contactInfo } = req.body;
    if (!interactionId) return res.status(400).json({ error: 'interactionId is required' });

    console.log(`[servicenow] close-interaction: ${interactionId} | case=${providedCase || 'auto'} | contact=${contactInfo}`);

    try {
        // 1. Get buffered live messages (may be empty for voice / mock IDs)
        const messages = await getLiveMessages(interactionId).catch(() => []);

        // 2. Get cached transcript from last AI analysis (populated by /api/transcript/analyze on each poll)
        const cached = transcript.getCachedAnalysis(interactionId);

        // 3. Prefer live messages; fall back to cached transcript text
        let transcriptText = '';
        if (messages.length > 0) {
            transcriptText = messages
                .map(m => `[${m.sender.toUpperCase()}] (${new Date(m.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}): ${m.body}`)
                .join('\n');
        } else if (cached?.transcriptText) {
            transcriptText = cached.transcriptText;
            console.log(`[servicenow] close-interaction: using cached transcript (${transcriptText.length} chars)`);
        }

        // 4. Generate closing summary via AI (only if transcript available)
        let summary       = null;
        let extractedCase = null;
        if (transcriptText) {
            const result = await transcript.generateClosingSummary(transcriptText, contactInfo || '');
            summary       = result.summary;
            extractedCase = result.caseNumber;
        }

        // 5. Determine case number: explicit param > AI extraction > cached intel
        const targetCase = providedCase || extractedCase || cached?.intel?.caseNumber || null;
        if (!targetCase) {
            console.warn(`[servicenow] close-interaction: no caseNumber found for ${interactionId}`);
            clearBuffer(interactionId);
            transcript.clearCachedAnalysis(interactionId);
            return res.json({ ok: false, reason: 'no_case_number', summary });
        }

        // 6. Build the description field — use cached intel fields when no transcript
        const now   = new Date().toLocaleString('en-GB');
        const intel = cached?.intel || {};

        let intelSection = '';
        if (intel.requestType && intel.requestType !== 'unknown') {
            intelSection += `\n\n--- AI ANALYSIS ---`;
            if (intel.customerName)    intelSection += `\nCustomer: ${intel.customerName}`;
            if (intel.requestType)     intelSection += `\nRequest Type: ${intel.requestType}`;
            if (intel.caseNumber)      intelSection += `\nCase: ${intel.caseNumber}`;
            if (intel.requestSummary)  intelSection += `\nSummary: ${intel.requestSummary}`;
            if (intel.agentSuggestion) intelSection += `\nAgent note: ${intel.agentSuggestion}`;
        }

        const transcriptSection = transcriptText
            ? `\n\n--- TRANSCRIPT (${messages.length || 'cached'} messages) ---\n${transcriptText}`
            : summary
                ? `\n\n--- AI CLOSING SUMMARY ---\n${summary}`
                : `\n\n[No transcript available — voice channel without speech-to-text]`;

        const description = `[MCP-CRM] Interaction closed — ${now}\nContact: ${contactInfo || '—'}\nInteraction ID: ${interactionId}${intelSection}${transcriptSection}`;

        // 7. Update ServiceNow incident
        const sys_id = await snow.updateIncidentByNumber(targetCase, {
            description,
            work_notes: `[MCP-CRM] Interaction automatically closed. Contact: ${contactInfo}. ID: ${interactionId}.`
        });

        // 8. Clear buffers
        clearBuffer(interactionId);
        transcript.clearCachedAnalysis(interactionId);

        if (!sys_id) {
            console.warn(`[servicenow] close-interaction: case ${targetCase} not found in ServiceNow`);
            return res.json({ ok: false, reason: 'case_not_found', caseNumber: targetCase, summary });
        }

        console.log(`[servicenow] close-interaction: ${targetCase} updated (sys_id=${sys_id})`);
        res.json({ ok: true, caseNumber: targetCase, sys_id });

    } catch (e) {
        console.error('[servicenow] close-interaction error:', e.message);
        clearBuffer(interactionId); // always clear, even on error
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
