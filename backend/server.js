'use strict';

/**
 * MCP-CRM Backend — Express entry point
 *
 * Starts the REST API server that bridges:
 *  - Genesys Cloud (interaction history, transcripts)
 *  - ServiceNow (incident management)
 *  - Anthropic Claude AI (transcript analysis)
 *
 * Environment variables are loaded from backend/.env via dotenv.
 */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// Route modules — each handles one integration domain
const transcriptRoutes  = require('./routes/transcript');
const genesysRoutes     = require('./routes/genesys');
const servicenowRoutes  = require('./routes/servicenow');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────

// Allow cross-origin requests from the SmartUI frontend.
// 'null' covers file:// origins (browsers treat them as 'null' origin).
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:8080',
        'http://localhost:8080',
        'null'
    ]
}));

// Parse incoming JSON request bodies (required for POST endpoints)
app.use(express.json());

// ── Request Logger ────────────────────────────────────────────────

// Simple request logger — prints method, path and query params to stdout
app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.path}`, req.query);
    next();
});

// ── Routes ────────────────────────────────────────────────────────

app.use('/api/transcript', transcriptRoutes);   // Claude AI transcript analysis
app.use('/api/genesys',    genesysRoutes);       // Genesys Cloud interaction history
app.use('/api/servicenow', servicenowRoutes);    // ServiceNow incident management

// ── Health Check ──────────────────────────────────────────────────

/**
 * GET /health
 * Returns which integrations are configured (based on env vars).
 * Useful for debugging — does NOT test actual connectivity.
 */
app.get('/health', (_req, res) => {
    res.json({
        ok:         true,
        genesys:    !!process.env.GENESYS_CLIENT_ID,
        servicenow: !!process.env.SNOW_INSTANCE,
        claude:     !!process.env.ANTHROPIC_API_KEY,
        env:        process.env.GENESYS_ENVIRONMENT
    });
});

// ── Start ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║  MCP-CRM Backend  →  http://localhost:${PORT}`);
    console.log(`╚═══════════════════════════════════════╝`);
    console.log(`  Genesys:     ${process.env.GENESYS_ENVIRONMENT}`);
    console.log(`  ServiceNow:  ${process.env.SNOW_INSTANCE}`);
    console.log(`  Claude AI:   ${process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ not configured (using heuristic fallback)'}\n`);
});
