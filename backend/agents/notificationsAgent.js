'use strict';

/**
 * NotificationsAgent — Live messages via REST polling
 *
 * Genesys Cloud does not fire notification WebSocket events for individual
 * messages in agent-connected webmessaging conversations (queue topics only
 * fire during the routing/pre-answer phase).
 *
 * Instead, we poll GET /conversations/messages/{id} which returns all
 * participants with their messages[] arrays containing messageIds.
 * New messageIds are bulk-fetched for their text bodies and buffered.
 *
 * Called on every frontend poll (every 3s) — incremental: only fetches new IDs.
 */

const axios = require('axios');

// Buffer: conversationId → ChatMessage[]  (max 200 per conversation)
const _buffer = new Map();

// ── Public API ────────────────────────────────────────────────────

/**
 * Fetches and buffers new messages for an active webmessaging conversation.
 * Incremental: only requests message bodies for IDs not already buffered.
 *
 * @param {string} conversationId
 * @returns {Promise<ChatMessage[]>} Messages sorted oldest→newest
 */
async function getLiveMessages(conversationId) {
    try {
        const api = await _buildApi();

        // 1. Get conversation snapshot → extract all messageIds from participants
        const { data: conv } = await api.get(`/conversations/messages/${conversationId}`);
        const allIds = [];
        for (const p of (conv.participants || [])) {
            for (const m of (p.messages || [])) {
                // Only include text messages (skip events like Join/Leave, QuickReply clicks)
                const type = m.messageMetadata?.type;
                if (type && type !== 'Text' && type !== 'Standard') continue;
                if (m.messageId) allIds.push(m.messageId);
            }
        }

        // 2. Find IDs not yet in buffer
        const existing    = _buffer.get(conversationId) || [];
        const existingIds = new Set(existing.map(m => m.id));
        const newIds      = allIds.filter(id => !existingIds.has(id));

        if (!newIds.length) return existing;

        // 3. Bulk-fetch message bodies for new IDs
        // The bulk endpoint expects a plain array of ID strings (not objects)
        const { data } = await api.post(
            `/conversations/messages/${conversationId}/messages/bulk`,
            newIds
        );

        const fetched = (data.entities || []).flatMap(m => {
            const body = m.textBody
                || (m.normalizedMessage?.content || []).find(c => c.contentType === 'Text')?.text
                || (m.content || []).find(c => c.contentType === 'Text')?.text
                || '';
            if (!body) return [];
            return [{
                id:        m.id,
                body,
                direction: m.direction || 'inbound',
                timestamp: m.timestamp || m.dateCreated || new Date().toISOString(),
                sender:    m.direction === 'outbound' ? 'Agente' : 'Cliente'
            }];
        });

        if (!fetched.length) return existing;

        const updated = [...existing, ...fetched]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-200);

        _buffer.set(conversationId, updated);
        console.log(`[LiveMessages] +${fetched.length} msg(s) for ${conversationId} (total ${updated.length})`);
        return updated;

    } catch (e) {
        console.warn(`[LiveMessages] error for ${conversationId}:`, e.response?.data?.message || e.message);
        return _buffer.get(conversationId) || [];
    }
}

// ── Internal ──────────────────────────────────────────────────────

async function _buildApi() {
    const { getToken } = require('./genesysAgent');
    const token = await getToken();
    return axios.create({
        baseURL: `https://api.${process.env.GENESYS_ENVIRONMENT || 'mypurecloud.com'}/api/v2`,
        headers: { Authorization: `Bearer ${token}` }
    });
}

module.exports = { getLiveMessages };
