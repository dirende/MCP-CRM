'use strict';

/**
 * Route: /api/servicenow
 *
 * Exposes ServiceNow incident management to the SmartUI frontend.
 */
const express = require('express');
const router  = express.Router();
const snow    = require('../agents/servicenowAgent');

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

module.exports = router;
