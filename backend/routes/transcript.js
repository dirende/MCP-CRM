'use strict';

/**
 * Route: /api/transcript
 *
 * Handles transcript analysis requests from the SmartUI frontend.
 * Orchestrates: Genesys (fetch transcript) → Claude AI (analyze) → response.
 */
const express    = require('express');
const router     = express.Router();
const genesys    = require('../agents/genesysAgent');
const transcript = require('../agents/transcriptAgent');

/**
 * GET /api/transcript/analyze
 *
 * Fetches and analyzes the transcript for an active Genesys conversation.
 *
 * Query params:
 *  - interactionId {string} - Genesys conversation ID (optional if contactInfo provided)
 *  - contactInfo   {string} - Customer phone or email (used as context/fallback)
 *
 * Flow:
 *  1. Fetch the conversation from Genesys to determine mediaType
 *  2. Fetch the appropriate transcript (voice recording or messaging thread)
 *  3. Pass transcript + contactInfo to TranscriptAgent for analysis
 *  4. Return the CustomerIntel JSON object
 *
 * Response: CustomerIntel { customerName, contact, requestType, caseNumber, excerpt }
 */
router.get('/analyze', async (req, res) => {
    const { interactionId, contactInfo } = req.query;

    if (!interactionId && !contactInfo) {
        return res.status(400).json({ error: 'interactionId or contactInfo is required' });
    }

    try {
        let transcriptText = null;
        let mediaType      = 'unknown';

        if (interactionId) {
            // Fetch conversation metadata to determine the channel type
            try {
                const conv = await genesys.getConversation(interactionId);
                mediaType  = conv.participants?.[0]?.sessions?.[0]?.mediaType
                    || conv.conversationChannels?.[0]?.type
                    || 'unknown';

                // Fetch the actual transcript content (voice or messaging)
                transcriptText = await genesys.getTranscript(interactionId, mediaType);
            } catch (e) {
                // Non-fatal: proceed with null transcript → fallback intel will be returned
                console.warn(`[transcript] Cannot fetch transcript for ${interactionId}:`, e.message);
            }
        }

        // Analyze transcript (with AI or heuristic fallback)
        const intel = await transcript.analyzeTranscript(transcriptText, contactInfo || '');

        console.log(`[transcript] ${interactionId} → ${intel.requestType} | ${intel.customerName}`);
        res.json(intel);

    } catch (e) {
        console.error('[transcript] error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
