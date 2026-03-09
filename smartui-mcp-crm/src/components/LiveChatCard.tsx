import React from 'react';
import { Box, Chip, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ChatIcon        from '@mui/icons-material/Chat';
import ExpandMoreIcon  from '@mui/icons-material/ExpandMore';
import { ChatMessage } from '../models/interfaces/params';

interface Props {
    messages:   ChatMessage[];
    loading:    boolean;
    error:      string | null;
    mediaType:  string;
}

/**
 * LiveChatCard — shows the live conversation messages for an active webmessaging/chat interaction.
 *
 * Polls the backend every 3 seconds (via useLiveMessages hook in App.tsx).
 * Messages are displayed as chat bubbles: customer (left) vs agent (right).
 * The card auto-scrolls to the newest message when new ones arrive.
 *
 * Only rendered when mediaType is 'webmessaging' or 'chat'.
 */
export const LiveChatCard = ({ messages, loading, error, mediaType }: Props) => {
    const [collapsed, setCollapsed] = React.useState(false);
    const bottomRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom whenever new messages arrive
    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const badge = loading        ? 'LIVE'
        : error                  ? 'ERR'
        : messages.length > 0    ? `${messages.length} MSG`
        : 'LIVE';

    const badgeColor = error             ? '#f59e0b'
        : messages.length > 0            ? '#22c55e'
        : '#ef4444'; // red pulsing = waiting

    return (
        <Box sx={cardSx}>
            {/* Header */}
            <Box sx={cardHeaderSx}>
                <Box sx={{ ...iconSx, background: 'rgba(34,197,94,0.15)' }}>
                    <ChatIcon sx={{ fontSize: '14px', color: '#22c55e' }} />
                </Box>
                <Typography sx={cardTitleSx}>Live Chat</Typography>
                <Typography sx={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    💬 {mediaType}
                </Typography>
                <Chip label={badge} size="small" sx={badgeSx(badgeColor)} />
                <IconButton
                    size="small"
                    onClick={() => setCollapsed(c => !c)}
                    sx={{ color: '#cbd5e1', padding: '3px', ml: '2px',
                        '&:hover': { color: '#f1f5f9', background: 'rgba(255,255,255,0.08)' },
                        borderRadius: '5px' }}
                >
                    <ExpandMoreIcon sx={{ fontSize: '20px', transition: 'transform 0.25s',
                        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                </IconButton>
            </Box>

            {/* Body */}
            {!collapsed && (
                <Box sx={{ padding: '8px 10px' }}>
                    {!loading && error && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#ef4444' }}>⚠ {error}</Typography>
                    )}

                    {/* Message list */}
                    <Box sx={messageListSx}>
                        {messages.length === 0 && (
                            <Stack alignItems="center" padding="12px 0" gap="4px"
                                sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                <CircularProgress size={12} thickness={4} sx={{ color: '#22c55e' }} />
                                In ascolto messaggi...
                            </Stack>
                        )}

                        {messages.map((msg) => (
                            <Box key={msg.id} sx={bubbleRowSx(msg.direction)}>
                                {/* Sender label */}
                                <Typography sx={senderSx(msg.direction)}>{msg.sender}</Typography>

                                {/* Message bubble */}
                                <Box sx={bubbleSx(msg.direction)}>{msg.body}</Box>

                                {/* Timestamp */}
                                {msg.timestamp && (
                                    <Typography sx={timeSx}>{formatTime(msg.timestamp)}</Typography>
                                )}
                            </Box>
                        ))}

                        {/* Invisible anchor — scrollIntoView targets this */}
                        <div ref={bottomRef} />
                    </Box>
                </Box>
            )}
        </Box>
    );
};

// ── Helpers ───────────────────────────────────────────────────────

/** Formats an ISO timestamp to HH:MM */
function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

// ── Styles ────────────────────────────────────────────────────────

const cardSx      = { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' };
const cardHeaderSx = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', borderBottom: '1px solid #334155',
    background: 'rgba(255,255,255,0.02)'
};
const iconSx = {
    width: 26, height: 26, borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
};
const cardTitleSx = { fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' };

// Scrollable message area — max 220px so it doesn't dominate the panel
const messageListSx = {
    maxHeight:  '220px',
    overflowY:  'auto' as const,
    display:    'flex',
    flexDirection: 'column' as const,
    gap:        '6px',
    padding:    '2px 0',
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: '2px' }
};

// Row layout: customer = left-aligned, agent = right-aligned
const bubbleRowSx = (dir: string) => ({
    display:    'flex',
    flexDirection: 'column' as const,
    alignItems: dir === 'outbound' ? 'flex-end' : 'flex-start',
    gap:        '2px'
});

const senderSx = (dir: string) => ({
    fontSize:    '0.58rem',
    fontWeight:  600,
    color:       dir === 'outbound' ? '#0ea5e9' : '#94a3b8',
    paddingX:    '2px'
});

// Bubble: customer = dark gray, agent = blue tint
const bubbleSx = (dir: string) => ({
    maxWidth:     '85%',
    padding:      '5px 9px',
    borderRadius: dir === 'outbound' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
    background:   dir === 'outbound' ? 'rgba(14,165,233,0.15)' : 'rgba(148,163,184,0.1)',
    border:       `1px solid ${dir === 'outbound' ? 'rgba(14,165,233,0.25)' : 'rgba(148,163,184,0.15)'}`,
    color:        dir === 'outbound' ? '#bae6fd' : '#e2e8f0',
    fontSize:     '0.72rem',
    lineHeight:   1.45,
    wordBreak:    'break-word' as const
});

const timeSx = {
    fontSize: '0.58rem',
    color:    '#475569',
    padding:  '0 2px'
};

const badgeSx = (color: string) => ({
    fontSize: '0.55rem', fontWeight: 700, height: '18px',
    color, background: `${color}18`,
    '& .MuiChip-label': { padding: '0 6px' }
});
