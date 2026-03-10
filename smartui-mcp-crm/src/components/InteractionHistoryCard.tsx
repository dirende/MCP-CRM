import React from 'react';
import { Box, Chip, CircularProgress, IconButton, Stack, Table, TableBody,
    TableCell, TableHead, TableRow, Typography } from '@mui/material';
import BarChartIcon   from '@mui/icons-material/BarChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { GenesysInteraction } from '../models/interfaces/params';

interface Props {
    data:    GenesysInteraction[];
    loading: boolean;
    error:   string | null;
}

// Maps Genesys mediaType values to emoji icons
const CHANNEL_ICON: Record<string, string> = {
    voice: '📞', email: '✉️', webmessaging: '💬', chat: '💬',
    whatsapp: '📱', sms: '📱', callback: '↩️'
};

// Maps Genesys mediaType values to brand colors for the channel badge
const CHANNEL_COLOR: Record<string, string> = {
    voice: '#0ea5e9', email: '#6366f1', webmessaging: '#22c55e',
    chat: '#22c55e', whatsapp: '#25D366', sms: '#f59e0b', callback: '#94a3b8'
};

/**
 * InteractionHistoryCard — shows the last 5 Genesys Cloud interactions for the current contact.
 *
 * Displays a compact table with: date/time, channel (with colored badge), duration, and wrapup code.
 * Wrapup codes are resolved from UUIDs to human-readable names by the backend.
 *
 * The card body is collapsible — click the chevron icon in the header to toggle.
 *
 * Data comes from the useGenesysHistory hook (via App.tsx).
 */
export const InteractionHistoryCard = ({ data, loading, error }: Props) => {
    // collapsed = true → only the header bar is visible, body content is hidden
    const [collapsed, setCollapsed] = React.useState(false);

    // Build the header badge label based on current state
    const badge = loading       ? 'LIVE'
        : error                 ? 'ERR'
        : data.length > 0       ? `${data.length} INT.`
        : 'NO DATA';

    const badgeColor = loading  ? '#ef4444'
        : error                 ? '#f59e0b'
        : data.length > 0       ? '#22c55e'
        : '#94a3b8';

    return (
        <Box sx={cardSx}>
            {/* Header — always visible, contains title + count badge + collapse toggle */}
            <Box sx={cardHeaderSx(collapsed)}>
                <Box sx={{ ...iconSx, background: 'rgba(99,102,241,0.15)' }}>
                    <BarChartIcon sx={{ fontSize: '14px', color: '#6366f1' }} />
                </Box>
                <Typography sx={cardTitleSx}>Interaction History</Typography>
                {/* Source label pushed to the right by marginLeft: 'auto' */}
                <Typography sx={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    Genesys Cloud API
                </Typography>
                <Chip label={badge} size="small" sx={badgeSx(badgeColor)} />
                {/* Collapse toggle — chevron rotates 90° when body is collapsed */}
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

            {/* Body — conditionally rendered based on collapsed state */}
            {!collapsed && (
                <Box sx={{ padding: '10px 12px' }}>
                    {loading && <LoadingRow label="Loading from Genesys Cloud API..." />}

                    {!loading && error && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#ef4444' }}>⚠ {error}</Typography>
                    )}

                    {!loading && !error && data.length === 0 && (
                        <EmptyState icon="📊" label="No interaction history found" />
                    )}

                    {!loading && !error && data.length > 0 && (
                        // Dense table — cells have reduced padding for compact display
                        <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '5px 6px', borderColor: 'rgba(51,65,85,0.5)' } }}>
                            <TableHead>
                                <TableRow>
                                    {['Date/Time', 'Channel', 'Duration', 'Wrapup'].map(h => (
                                        <TableCell key={h} sx={thSx}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.map((row, i) => (
                                    <TableRow key={i} hover sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                        <TableCell sx={tdSx}>{formatDate(row.startTime)}</TableCell>

                                        {/* Channel badge — colored by media type */}
                                        <TableCell sx={tdSx}>
                                            <Box component="span" sx={{
                                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                padding: '2px 6px', borderRadius: '4px',
                                                fontSize: '0.62rem', fontWeight: 600,
                                                background: `${CHANNEL_COLOR[row.mediaType] || '#94a3b8'}18`,
                                                color:      CHANNEL_COLOR[row.mediaType] || '#94a3b8'
                                            }}>
                                                {CHANNEL_ICON[row.mediaType] || '🔗'} {row.mediaType}
                                            </Box>
                                        </TableCell>

                                        <TableCell sx={tdSx}>{row.duration || '—'}</TableCell>

                                        {/* Wrapup code — resolved to human-readable name by the backend */}
                                        <TableCell sx={tdSx}>
                                            <Box component="span" sx={{
                                                display: 'inline-block', padding: '2px 5px', borderRadius: '4px',
                                                fontSize: '0.62rem', fontWeight: 600,
                                                background: 'rgba(148,163,184,0.1)', color: '#94a3b8'
                                            }}>
                                                {row.wrapup || '—'}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Box>
            )}
        </Box>
    );
};

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Formats an ISO 8601 timestamp to a localized Italian short date+time string.
 * Example: "2026-03-05T09:12:00Z" → "05/03/26, 09:12"
 */
function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return iso; } // return raw string if parsing fails
}

const LoadingRow = ({ label }: { label: string }) => (
    <Stack direction="row" alignItems="center" gap="8px" padding="10px 0"
        sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
        <CircularProgress size={14} thickness={4} sx={{ color: '#6366f1' }} />
        {label}
    </Stack>
);

const EmptyState = ({ icon, label }: { icon: string; label: string }) => (
    <Stack alignItems="center" padding="16px 0" gap="4px"
        sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
        <span style={{ fontSize: '1.6rem', opacity: 0.35 }}>{icon}</span>
        {label}
    </Stack>
);

// ── Styles ────────────────────────────────────────────────────────

const cardSx      = { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'clip' };
const cardHeaderSx = (collapsed: boolean) => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px',
    borderBottom: collapsed ? 'none' : '1px solid #334155',
    background: 'rgba(255,255,255,0.02)'
});
const iconSx      = {
    width: 26, height: 26, borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
};
const cardTitleSx = { fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' };
const thSx        = {
    fontSize: '0.58rem', fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase' as const, letterSpacing: '0.4px',
    borderBottom: '1px solid #334155 !important'
};
const tdSx        = { fontSize: '0.68rem', color: '#e2e8f0' };
const badgeSx     = (color: string) => ({
    fontSize: '0.55rem', fontWeight: 700, height: '18px',
    color, background: `${color}18`,
    '& .MuiChip-label': { padding: '0 6px' }
});
