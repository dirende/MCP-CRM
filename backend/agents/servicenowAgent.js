'use strict';

/**
 * ServiceNowAgent — ServiceNow Table API wrapper
 *
 * Responsibilities:
 *  - Authenticate against ServiceNow (OAuth2 password grant, with Basic Auth fallback)
 *  - Search incidents associated with a customer (by phone or email)
 *  - Create new incidents on behalf of a customer
 *  - Return mock data when the real API is unavailable (demo/dev mode)
 *
 * Authentication strategy (in order of preference):
 *  1. OAuth2 Bearer token (if SNOW_CLIENT_ID + SNOW_CLIENT_SECRET are set)
 *  2. HTTP Basic Auth (SNOW_USERNAME + SNOW_PASSWORD)
 *  3. Hardcoded admin/admin (last resort — will almost certainly fail on real instances)
 */
const axios     = require('axios');
const NodeCache = require('node-cache');

// Cache for the OAuth2 access token — avoids fetching a new token on every request.
// ServiceNow tokens are valid for ~30 minutes; TTL is set to 28 minutes (1700s).
const tokenCache = new NodeCache({ stdTTL: 1700 });

// Base URL for the ServiceNow instance (e.g. https://ven07529.service-now.com)
const INSTANCE = `https://${process.env.SNOW_INSTANCE}`;

// ── Authentication ────────────────────────────────────────────────

/**
 * Returns the appropriate HTTP Authorization header for API requests.
 *
 * Tries OAuth2 first (better security, automatic token expiry management).
 * Falls back to Basic Auth if OAuth2 is not configured or the token request fails.
 *
 * @returns {Promise<Object>} Object with a single "Authorization" key
 */
async function getHeaders() {

    // Strategy 1: OAuth2 Bearer token
    if (process.env.SNOW_CLIENT_ID && process.env.SNOW_CLIENT_SECRET) {
        let token = tokenCache.get('snow_token');

        if (!token) {
            try {
                // Use OAuth2 "password" grant — requires both client and user credentials.
                // This is the standard integration pattern for ServiceNow OAuth2.
                const resp = await axios.post(
                    `${INSTANCE}/oauth_token.do`,
                    new URLSearchParams({
                        grant_type:    'password',
                        client_id:     process.env.SNOW_CLIENT_ID,
                        client_secret: process.env.SNOW_CLIENT_SECRET,
                        username:      process.env.SNOW_USERNAME || 'admin',
                        password:      process.env.SNOW_PASSWORD || 'admin'
                    }).toString(),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
                token = resp.data.access_token;
                if (token) tokenCache.set('snow_token', token);
            } catch (e) {
                console.warn('[ServiceNowAgent] OAuth2 failed:', e.response?.data || e.message);
                // Fall through to Basic Auth below
            }
        }

        if (token) return { Authorization: `Bearer ${token}` };
    }

    // Strategy 2: HTTP Basic Auth
    if (process.env.SNOW_USERNAME && process.env.SNOW_PASSWORD) {
        const cred = Buffer.from(
            `${process.env.SNOW_USERNAME}:${process.env.SNOW_PASSWORD}`
        ).toString('base64');
        return { Authorization: `Basic ${cred}` };
    }

    // Strategy 3: Hardcoded admin/admin (fallback — will fail on non-default instances)
    const cred = Buffer.from('admin:admin').toString('base64');
    return { Authorization: `Basic ${cred}` };
}

/**
 * Creates a pre-configured axios instance for the ServiceNow Table API.
 * Automatically applies the correct auth headers and JSON content type.
 */
function apiClient() {
    return getHeaders().then(authHeaders =>
        axios.create({
            baseURL: `${INSTANCE}/api/now`,
            headers: {
                ...authHeaders,
                'Content-Type': 'application/json',
                'Accept':       'application/json'
            }
        })
    );
}

// ── Incident Search ───────────────────────────────────────────────

// Fields to retrieve from ServiceNow — keep minimal to reduce payload size
const SNOW_FIELDS = [
    'sys_id', 'number', 'short_description', 'state',
    'opened_at', 'assigned_to', 'caller_id'
].join(',');

// Maps ServiceNow numeric state codes to human-readable labels
const STATE_MAP = {
    '1': 'New',
    '2': 'In Progress',
    '3': 'On Hold',
    '6': 'Resolved',
    '7': 'Closed',
    '8': 'Cancelled'
};

/**
 * Searches for incidents associated with a customer contact (phone or email).
 * Returns the 10 most recent incidents, ordered by opened_at descending.
 *
 * On 401/403 (auth failure): returns mock/demo data instead of crashing.
 * On other errors: throws so the route handler can return HTTP 500.
 *
 * @param {string} contactInfo - Customer phone number or email address
 * @returns {Promise<Array>} Array of mapped incident objects
 */
async function getCases(contactInfo) {
    const client  = await apiClient();
    const isEmail = contactInfo.includes('@');

    // Build the ServiceNow encoded query string.
    // ^ means AND, ^OR means OR in ServiceNow sysparm_query syntax.
    let query;
    if (isEmail) {
        query = `caller_id.email=${contactInfo}^ORcaller_id.user_name=${contactInfo}`;
    } else {
        // Normalize the phone number by stripping Italian +39 prefix and spaces
        const phone = contactInfo.replace(/^\+39/, '').replace(/\s/g, '');
        query = `caller_id.phone=${contactInfo}^ORcaller_id.phone=${phone}^ORcaller_id.mobile_phone=${phone}`;
    }

    try {
        const { data } = await client.get('/table/incident', {
            params: {
                sysparm_query:         query + '^ORDERBYDESCopened_at',
                sysparm_fields:        SNOW_FIELDS,
                sysparm_limit:         10,
                sysparm_display_value: 'true' // return human-readable values for reference fields
            }
        });

        return (data.result || []).map(mapIncident);

    } catch (e) {
        const status = e.response?.status;
        const detail = e.response?.data || e.message;
        console.error(`[ServiceNowAgent] getCases error (HTTP ${status}):`, detail);

        // On auth failure: fall back to demo/mock data so the UI still works in demos
        if (status === 401 || status === 403) {
            console.warn('[ServiceNowAgent] auth failed — returning demo data');
            return mockCases(contactInfo);
        }

        throw e; // re-throw other errors (5xx, network, etc.)
    }
}

// ── Incident Creation ─────────────────────────────────────────────

/**
 * Creates a new ServiceNow incident for the given customer.
 * The incident is created with low urgency/impact (3/3) by default.
 *
 * @param {Object} params
 * @param {string} params.contactInfo       - Customer phone or email
 * @param {string} params.interactionId     - Genesys interaction ID (for audit trail)
 * @param {string} params.short_description - Incident title
 * @param {string} params.category          - ServiceNow category (default: "inquiry")
 * @returns {Promise<Object>} The created incident, mapped to the frontend shape
 */
async function createCase({ contactInfo, interactionId, short_description, category }) {
    const client  = await apiClient();
    const isEmail = contactInfo.includes('@');

    const body = {
        short_description: short_description || 'Case created by MCP-CRM Integration',
        category:          category || 'inquiry',
        urgency:           '3',   // Low
        impact:            '3',   // Low
        state:             '1',   // New
        // work_notes are internal — not visible to the customer in the customer portal
        work_notes: `Created by MCP-CRM SmartUI\nInteractionID: ${interactionId}\nContact: ${contactInfo}`
    };

    // Link the caller if contact is an email — ServiceNow resolves it to a user record
    if (isEmail) {
        body.caller_id = contactInfo;
    }

    try {
        const { data } = await client.post('/table/incident', body);
        return mapIncident(data.result);
    } catch (e) {
        console.error('[ServiceNowAgent] createCase error:', e.response?.data || e.message);
        throw e;
    }
}

// ── Mock Data (demo / auth fallback) ─────────────────────────────

/**
 * Returns hardcoded demo incidents for known test contacts.
 * Used when: (a) real API returns 401/403, or (b) no credentials are configured.
 * Returns an empty array for unknown contacts.
 */
function mockCases(contactInfo) {
    const MOCK = {
        '+393349089191': [
            {
                sys_id: 'm1', number: 'INC0010234',
                short_description: 'Problema connessione VPN aziendale',
                state:       { value: '2', display_value: 'In Progress' },
                opened_at:   { display_value: '2026-03-01 09:10:00' },
                assigned_to: { display_value: 'Marco Bianchi' }
            },
            {
                sys_id: 'm2', number: 'INC0009876',
                short_description: 'Richiesta reset password AD',
                state:       { value: '6', display_value: 'Resolved' },
                opened_at:   { display_value: '2026-02-14 14:22:00' },
                assigned_to: { display_value: 'Laura Verdi' }
            }
        ],
        'nicola.dirende@softphone.it': [
            {
                sys_id: 'm3', number: 'INC0010198',
                short_description: 'Email non ricevute dominio esterno',
                state:       { value: '2', display_value: 'In Progress' },
                opened_at:   { display_value: '2026-03-03 11:00:00' },
                assigned_to: { display_value: 'Marco Bianchi' }
            }
        ]
    };

    // Match both the original contact and the version without the +39 prefix
    const stripped = contactInfo.replace(/^\+39/, '');
    const rows = MOCK[contactInfo] || MOCK[stripped] || [];

    return rows.map(inc => ({
        sys_id:     inc.sys_id,
        number:     inc.number,
        subject:    inc.short_description,
        state:      inc.state.display_value,
        openedAt:   inc.opened_at.display_value.split(' ')[0], // date only, strip time
        assignedTo: inc.assigned_to.display_value,
        url:        `${INSTANCE}/incident.do?sys_id=${inc.sys_id}`
    }));
}

// ── Incident Mapping ──────────────────────────────────────────────

/**
 * ServiceNow returns reference fields in two formats depending on sysparm_display_value:
 *  - display_value=true  → { value: '2', display_value: 'In Progress' }
 *  - display_value=false → plain string '2'
 *
 * val()  extracts the raw system value (ID, code).
 * disp() extracts the human-readable label.
 * Both return `fallback` when the field is null/undefined.
 */
function val(field,  fallback = '') { return (typeof field === 'object' ? field?.value         : field) || fallback; }
function disp(field, fallback = '') { return (typeof field === 'object' ? field?.display_value : field) || fallback; }

/**
 * Normalizes a raw ServiceNow incident record to the frontend-friendly shape.
 */
function mapIncident(inc) {
    const stateCode  = val(inc.state);
    const stateLabel = disp(inc.state) || STATE_MAP[stateCode] || stateCode || 'Unknown';
    const sysId      = val(inc.sys_id);

    return {
        sys_id:     sysId,
        number:     disp(inc.number)            || val(inc.number),
        subject:    disp(inc.short_description) || val(inc.short_description),
        state:      stateLabel,
        openedAt:   disp(inc.opened_at).split(' ')[0], // date only, no time
        assignedTo: disp(inc.assigned_to, 'Unassigned'),
        callerName: disp(inc.caller_id)  || null,
        url:        `${INSTANCE}/incident.do?sys_id=${sysId}`
    };
}

// ── Incident Update ───────────────────────────────────────────────

/**
 * Updates an existing ServiceNow incident identified by its number (e.g. INC0012345).
 * Uses PATCH on /table/incident/{sys_id} — only specified fields are changed.
 *
 * @param {string} number - Incident number (INC/CHG/REQ/RITM)
 * @param {Object} fields - Fields to update (e.g. { description, work_notes })
 * @returns {Promise<string|null>} sys_id of the updated record, or null if not found
 */
async function updateIncidentByNumber(number, fields) {
    const client = await apiClient();
    try {
        // Resolve incident number → sys_id (needed for PATCH URL)
        const { data: search } = await client.get('/table/incident', {
            params: {
                sysparm_query:         `number=${number}`,
                sysparm_fields:        'sys_id',
                sysparm_limit:         1,
                sysparm_display_value: false
            }
        });
        const record = search.result?.[0];
        if (!record) {
            console.warn(`[ServiceNowAgent] updateIncidentByNumber: ${number} not found`);
            return null;
        }
        const sys_id = typeof record.sys_id === 'object' ? record.sys_id.value : record.sys_id;
        await client.patch(`/table/incident/${sys_id}`, fields);
        console.log(`[ServiceNowAgent] updated ${number} (${sys_id}): fields=[${Object.keys(fields).join(', ')}]`);
        return sys_id;
    } catch (e) {
        console.error('[ServiceNowAgent] updateIncidentByNumber error:', e.response?.data || e.message);
        throw e;
    }
}

module.exports = { getCases, createCase, updateIncidentByNumber };
