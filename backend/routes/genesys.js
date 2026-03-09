'use strict';

/**
 * Route: /api/genesys
 *
 * Exposes Genesys Cloud data to the SmartUI frontend.
 */
const express = require('express');
const router  = express.Router();
const genesys = require('../agents/genesysAgent');

/**
 * GET /api/genesys/history?contactInfo=<phone|email>
 *
 * Returns the most recent interactions for the given contact,
 * limited to the last 5 results (sliced from up to 20 fetched).
 *
 * Response: { interactions: GenesysInteraction[] }
 * Each interaction: { id, startTime, mediaType, duration, wrapup, direction }
 */
router.get('/history', async (req, res) => {
    const { contactInfo } = req.query;
    if (!contactInfo) return res.status(400).json({ error: 'contactInfo is required' });

    try {
        const all          = await genesys.getInteractionHistory(contactInfo);
        const interactions = all.slice(0, 5); // show only the 5 most recent
        console.log(`[genesys] history ${contactInfo} → ${interactions.length} interactions`);
        res.json({ interactions });
    } catch (e) {
        console.error('[genesys] history error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/genesys/token
 *
 * Debug/test endpoint — verifies that Genesys authentication is working.
 * Returns only the first 20 characters of the token for security.
 *
 * Response: { ok: boolean, tokenPreview?: string, error?: string }
 */
router.get('/token', async (req, res) => {
    try {
        const token = await genesys.getToken();
        res.json({ ok: true, tokenPreview: token.slice(0, 20) + '...' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
