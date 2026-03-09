'use strict';

/**
 * GenesysAgent — Genesys Cloud Platform Client SDK wrapper
 *
 * Responsibilities:
 *  - Authenticate via Client Credentials Grant (OAuth2 machine-to-machine)
 *  - Query Analytics API for interaction history (last 90 days, chunked in 7-day windows)
 *  - Fetch conversation transcripts (voice recordings or messaging threads)
 *  - Resolve wrapup code UUIDs to human-readable names (cached 1h)
 *
 * SDK used: purecloud-platform-client-v2 (official Genesys Node.js SDK)
 */
const platformClient = require('purecloud-platform-client-v2');
const axios          = require('axios');
const NodeCache      = require('node-cache');

// SDK API instances — each handles a different domain of Genesys Cloud
const client           = platformClient.ApiClient.instance;
const analyticsApi     = new platformClient.AnalyticsApi();
const conversationsApi = new platformClient.ConversationsApi();
const routingApi       = new platformClient.RoutingApi();

// Cache for wrapup code names — avoids repeated API calls for the same UUID
// TTL = 1 hour (wrapup codes rarely change)
const wrapupCache = new NodeCache({ stdTTL: 3600 });

// Singleton auth promise — ensures only one login request is in flight at a time.
// Set to null after failure so the next caller retries authentication.
let _authPromise = null;

// ── Region mapping ────────────────────────────────────────────────

/**
 * Maps Genesys Cloud environment hostnames to SDK region constants.
 * The environment is configured in .env as GENESYS_ENVIRONMENT.
 */
const ENV_REGION = {
    'mypurecloud.com':    platformClient.PureCloudRegionHosts.us_east_1,
    'mypurecloud.ie':     platformClient.PureCloudRegionHosts.eu_west_1,
    'mypurecloud.de':     platformClient.PureCloudRegionHosts.eu_central_1,
    'mypurecloud.com.au': platformClient.PureCloudRegionHosts.ap_southeast_2,
    'mypurecloud.jp':     platformClient.PureCloudRegionHosts.ap_northeast_1,
    'usw2.pure.cloud':    platformClient.PureCloudRegionHosts.us_west_2,
    'cac1.pure.cloud':    platformClient.PureCloudRegionHosts.ca_central_1,
    'euw2.pure.cloud':    platformClient.PureCloudRegionHosts.eu_west_2,
};

// ── Authentication ────────────────────────────────────────────────

/**
 * Ensures the SDK is authenticated before making API calls.
 * Uses a singleton promise to prevent duplicate login requests when
 * multiple concurrent callers call this function at startup.
 *
 * On failure: resets _authPromise to null so the next call retries.
 */
async function ensureAuth() {
    if (_authPromise) return _authPromise;

    const env = process.env.GENESYS_ENVIRONMENT || 'mypurecloud.com';
    client.setEnvironment(ENV_REGION[env] || env);

    _authPromise = client.loginClientCredentialsGrant(
        process.env.GENESYS_CLIENT_ID,
        process.env.GENESYS_CLIENT_SECRET
    ).catch(e => {
        _authPromise = null; // allow retry on next call
        throw e;
    });

    return _authPromise;
}

/**
 * Returns the current OAuth2 access token.
 * Used when building manual axios clients for endpoints not covered by the SDK.
 */
async function getToken() {
    await ensureAuth();
    return client.authData?.accessToken || '';
}

/**
 * Creates an axios instance pre-configured with the Bearer token
 * and the correct Genesys Cloud API base URL for the configured region.
 */
function apiAxios() {
    return getToken().then(token => axios.create({
        baseURL: `https://api.${process.env.GENESYS_ENVIRONMENT}/api/v2`,
        headers: { Authorization: `Bearer ${token}` }
    }));
}

// ── Interaction History ───────────────────────────────────────────

/**
 * Fetches the most recent interactions for a given contact (phone or email).
 * Returns up to 20 results, looking back 90 days.
 *
 * WHY chunked in 7-day windows?
 * The Genesys Analytics synchronous query API has a maximum interval of 7 days.
 * We iterate backward in time, one week at a time, until we have 20 results
 * or we've covered the full 90-day lookback window.
 *
 * @param {string} contactInfo - Phone number (e.g. "+393349089191") or email address
 * @returns {Promise<Array>} Array of mapped interaction objects
 */
async function getInteractionHistory(contactInfo) {
    await ensureAuth();

    const isEmail = contactInfo.includes('@');
    const value   = contactInfo.replace('tel:', '').trim();
    const phone   = value.replace(/^\+39/, ''); // strip Italian country code for fallback match

    // Define the full lookback window (90 days back from now)
    const now  = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);

    const results  = [];
    let chunkEnd   = new Date(now);

    // Walk backwards in 7-day chunks until we have 20 results or exhaust the window
    while (chunkEnd > from && results.length < 20) {
        const chunkStart = new Date(chunkEnd);
        chunkStart.setDate(chunkStart.getDate() - 7);
        if (chunkStart < from) chunkStart.setTime(from.getTime()); // clamp to window start

        // ISO 8601 interval format required by Genesys Analytics API
        const interval = `${chunkStart.toISOString()}/${chunkEnd.toISOString()}`;

        // Build search predicates: email searches addressTo, phone searches ANI
        const predicates = isEmail
            ? [{ type: 'dimension', dimension: 'addressTo', operator: 'matches', value }]
            : [
                { type: 'dimension', dimension: 'ani', operator: 'matches', value },
                { type: 'dimension', dimension: 'ani', operator: 'matches', value: phone }
              ];

        const body = {
            interval,
            order:          'desc',
            orderBy:        'conversationStart',
            paging:         { pageSize: 20, pageNumber: 1 },
            segmentFilters: [{ type: 'or', predicates }]
        };

        try {
            const data = await analyticsApi.postAnalyticsConversationsDetailsQuery(body);
            for (const c of (data.conversations || [])) {
                if (results.length >= 20) break;
                results.push(mapConversation(c));
            }
        } catch (e) {
            // Log and skip failed windows — partial results are better than none
            console.warn(`[GenesysAgent] analytics error for ${interval}:`, e.message || e);
        }

        chunkEnd = new Date(chunkStart); // move window back by one week
    }

    // Resolve wrapup code UUIDs → human-readable names in parallel
    await Promise.all(results.map(async r => {
        if (r.wrapup && r.wrapup !== '—') {
            r.wrapup = await resolveWrapupCode(r.wrapup);
        }
    }));

    return results;
}

/**
 * Maps a raw Genesys Analytics conversation object to the simplified
 * GenesysInteraction shape expected by the frontend.
 *
 * Iterates participants → sessions → segments to extract:
 *  - mediaType (voice, email, webmessaging, etc.)
 *  - wrapUpCode UUID (resolved to a name later)
 */
function mapConversation(c) {
    // Calculate duration in seconds from ISO timestamps
    const durationSec = c.conversationEnd && c.conversationStart
        ? Math.round((new Date(c.conversationEnd) - new Date(c.conversationStart)) / 1000)
        : null;

    let wrapup = null, mediaType = null;

    // Walk the nested participant/session/segment tree to find mediaType and wrapup
    for (const p of (c.participants || [])) {
        for (const s of (p.sessions || [])) {
            if (!mediaType) mediaType = s.mediaType;
            for (const seg of (s.segments || [])) {
                if (seg.wrapUpCode && !wrapup) wrapup = seg.wrapUpCode; // take first found
            }
        }
    }

    return {
        id:        c.conversationId,
        startTime: c.conversationStart,
        mediaType: mediaType || 'voice',
        duration:  durationSec != null ? formatDuration(durationSec) : '—',
        wrapup:    wrapup || '—',
        direction: 'Inbound'
    };
}

// ── Transcripts ───────────────────────────────────────────────────

/**
 * Fetches a conversation object by ID.
 * Used to determine the mediaType before fetching the transcript.
 */
async function getConversation(conversationId) {
    const api = await apiAxios();
    const { data } = await api.get(`/conversations/${conversationId}`);
    return data;
}

/**
 * Fetches the transcript for a messaging conversation (chat, email, webmessaging).
 * Returns messages formatted as "Cliente: ..." / "Agente: ..." lines.
 * Returns null if no messages are found or on API error.
 */
async function getMessagingTranscript(conversationId) {
    await ensureAuth();
    try {
        const data = await conversationsApi.getConversationMessages(conversationId);
        return (data.entities || [])
            .filter(m => m.textBody || m.body)
            .map(m => `${m.direction === 'inbound' ? 'Cliente' : 'Agente'}: ${m.textBody || m.body}`)
            .join('\n') || null;
    } catch (e) {
        console.warn('[GenesysAgent] getMessagingTranscript:', e.message);
        return null;
    }
}

/**
 * Fetches the transcript for a voice conversation.
 * Checks up to 2 recordings per conversation and returns the first
 * one that has a JSON transcript attached.
 * Returns null if no transcript is available (common for short/abandoned calls).
 */
async function getVoiceTranscript(conversationId) {
    const api = await apiAxios();
    try {
        const { data: recs } = await api.get(`/conversations/${conversationId}/recordings`);
        for (const rec of (Array.isArray(recs) ? recs : []).slice(0, 2)) {
            try {
                const { data: t } = await api.get(
                    `/conversations/${conversationId}/recordings/${rec.id}`,
                    { params: { formatId: 'JSON' } }
                );
                if (t?.transcript) return t.transcript;
            } catch { /* this recording has no transcript, try next */ }
        }
    } catch { /* no recordings available for this conversation */ }
    return null;
}

/**
 * Entry point for transcript fetching — routes to the correct method
 * based on conversation media type.
 */
async function getTranscript(conversationId, mediaType) {
    return mediaType === 'voice'
        ? getVoiceTranscript(conversationId)
        : getMessagingTranscript(conversationId);
}

// ── Wrapup Code Resolution ────────────────────────────────────────

/**
 * Resolves a wrapup code UUID to its human-readable name.
 * Results are cached for 1 hour to avoid repeated API calls.
 *
 * Falls back to returning the raw UUID if the API call fails
 * (better to show the UUID than nothing).
 *
 * @param {string} id - Wrapup code UUID
 * @returns {Promise<string>} Human-readable name or original UUID on error
 */
async function resolveWrapupCode(id) {
    if (!id || id === '—') return id;

    const cached = wrapupCache.get(id);
    if (cached) return cached;

    try {
        const data = await routingApi.getRoutingWrapupcode(id);
        const name = data.name || id;
        wrapupCache.set(id, name);
        return name;
    } catch {
        return id; // fallback: show UUID rather than crash
    }
}

// ── Utilities ─────────────────────────────────────────────────────

/**
 * Formats a duration in seconds to a human-readable string.
 * Examples: 45 → "45s", 90 → "1m 30s", 3661 → "61m 01s"
 */
function formatDuration(sec) {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${(sec % 60).toString().padStart(2, '0')}s`;
}

module.exports = { getToken, ensureAuth, getConversation, getTranscript, getInteractionHistory };
