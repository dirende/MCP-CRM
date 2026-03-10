import React from 'react';
import { Box, Button, Chip, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import PublicIcon     from '@mui/icons-material/Public';
import AddIcon        from '@mui/icons-material/Add';
import OpenInNewIcon  from '@mui/icons-material/OpenInNew';
import EventIcon      from '@mui/icons-material/Event';
import PersonIcon     from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SnowCase } from '../models/interfaces/params';

interface Props {
    cases:         SnowCase[];
    loading:       boolean;
    error:         string | null;
    creating:      boolean;
    contactInfo:   string;
    interactionId: string;
    onCreateCase:  (contactInfo: string, interactionId: string) => Promise<void>;
}

// Visual style for each ServiceNow incident state — color + short label + background
const STATE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    'New':         { label: 'NEW',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
    'In Progress': { label: 'IN CORSO',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    'On Hold':     { label: 'IN ATTESA', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
    'Resolved':    { label: 'RISOLTO',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
    'Closed':      { label: 'CHIUSO',    color: '#334155', bg: 'rgba(51,65,85,0.3)'     },
};

/** Returns the style for a given state string, with a fallback for unknown states */
function stateStyle(state: string) {
    return STATE_STYLE[state] || { label: state.toUpperCase(), color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
}

/**
 * ServiceNowCard — shows the last 3 ServiceNow incidents for the current contact,
 * and provides a button to create a new incident directly from the SmartUI.
 *
 * Each incident row shows: number, description, status badge, and a link to open it in ServiceNow.
 * Creating a new case triggers a screen pop (opens the new incident URL in a new tab).
 *
 * The card body is collapsible — click the chevron icon in the header to toggle.
 *
 * Data comes from the useServiceNowCases hook (via App.tsx).
 */
export const ServiceNowCard = ({
    cases, loading, error, creating, contactInfo, interactionId, onCreateCase
}: Props) => {
    // collapsed = true → only the header bar is visible, body content is hidden
    const [collapsed, setCollapsed] = React.useState(false);

    // Build the header badge label based on current state
    const badge = loading       ? 'LIVE'
        : error                 ? 'ERR'
        : cases.length > 0      ? `${cases.length} CASE`
        : 'NO DATA';

    const badgeColor = loading  ? '#ef4444'
        : error                 ? '#f59e0b'
        : cases.length > 0      ? '#22c55e'
        : '#94a3b8';

    const handleCreate = () => {
        if (!creating) onCreateCase(contactInfo, interactionId);
    };

    /** Opens a ServiceNow incident URL in a new browser tab (screen pop) */
    const openUrl = (url: string) => {
        if (url) window.open(url, '_blank');
    };

    return (
        <Box sx={cardSx}>
            {/* Header — always visible, contains title + case count badge + collapse toggle */}
            <Box sx={cardHeaderSx}>
                <Box sx={{ ...iconSx, background: 'rgba(34,197,94,0.15)' }}>
                    <PublicIcon sx={{ fontSize: '14px', color: '#22c55e' }} />
                </Box>
                <Typography sx={cardTitleSx}>ServiceNow Cases</Typography>
                {/* Instance hostname pushed to the right by marginLeft: 'auto' */}
                <Typography sx={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    ven07529.service-now.com
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
                    {loading && <LoadingRow label="Ricerca casi su ServiceNow..." />}

                    {!loading && error && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#ef4444' }}>⚠ {error}</Typography>
                    )}

                    {!loading && !error && cases.length === 0 && (
                        <EmptyState icon="🌐" label="Nessun caso trovato per questo cliente" />
                    )}

                    {/* Incident list — scrollable, max 3 visible cards */}
                    {!loading && !error && <Box sx={{ maxHeight: '280px', overflowY: 'auto',
                        pr: '2px',
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: '4px' },
                        '&::-webkit-scrollbar-thumb:hover': { background: '#475569' }
                    }}>
                    {cases.map(c => {
                        const ss = stateStyle(c.state);
                        return (
                            <Box key={c.sys_id} sx={caseSx}>
                                <Stack direction="row" alignItems="flex-start" gap="8px" mb="5px">
                                    <Box flex={1}>
                                        <Typography sx={caseNumberSx}>{c.number}</Typography>
                                        <Typography sx={caseSubjectSx}>{c.subject}</Typography>
                                    </Box>
                                    <Stack direction="row" alignItems="center" gap="4px">
                                        {/* Status badge */}
                                        <Box component="span" sx={{
                                            fontSize: '0.58rem', fontWeight: 700,
                                            padding: '2px 6px', borderRadius: '10px', whiteSpace: 'nowrap',
                                            color: ss.color, background: ss.bg
                                        }}>
                                            {ss.label}
                                        </Box>
                                        {/* External link — opens the incident in ServiceNow */}
                                        {c.url && (
                                            <Box
                                                component="span"
                                                onClick={() => openUrl(c.url!)}
                                                title="Apri in ServiceNow"
                                                sx={{
                                                    cursor: 'pointer', color: '#94a3b8',
                                                    '&:hover': { color: '#0ea5e9' },
                                                    display: 'flex', alignItems: 'center'
                                                }}
                                            >
                                                <OpenInNewIcon sx={{ fontSize: '13px' }} />
                                            </Box>
                                        )}
                                    </Stack>
                                </Stack>
                                {/* Metadata row: date opened + assigned agent */}
                                <Stack direction="row" gap="12px" sx={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                                    <Stack direction="row" alignItems="center" gap="3px">
                                        <EventIcon sx={{ fontSize: '10px' }} />
                                        {c.openedAt}
                                    </Stack>
                                    <Stack direction="row" alignItems="center" gap="3px">
                                        <PersonIcon sx={{ fontSize: '10px' }} />
                                        {c.assignedTo || 'Non assegnato'}
                                    </Stack>
                                </Stack>
                            </Box>
                        );
                    })}
                    </Box>}

                    {/* Create new case button — disabled while POST is in flight */}
                    {!loading && (
                        <Button
                            fullWidth
                            size="small"
                            startIcon={
                                creating
                                    ? <CircularProgress size={12} sx={{ color: '#0ea5e9' }} />
                                    : <AddIcon />
                            }
                            onClick={handleCreate}
                            disabled={creating}
                            sx={{
                                marginTop:     '8px',
                                border:        '1px dashed #334155',
                                color:         '#94a3b8',
                                fontSize:      '0.68rem',
                                textTransform: 'none',
                                '&:hover':      { borderColor: '#0ea5e9', color: '#0ea5e9', background: 'rgba(14,165,233,0.05)' },
                                '&.Mui-disabled': { color: '#334155', borderColor: '#334155' }
                            }}
                        >
                            {creating ? 'Creazione in corso...' : '+ Crea nuovo Case su ServiceNow'}
                        </Button>
                    )}
                </Box>
            )}
        </Box>
    );
};

// ── Sub-components ────────────────────────────────────────────────

const LoadingRow = ({ label }: { label: string }) => (
    <Stack direction="row" alignItems="center" gap="8px" padding="10px 0"
        sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
        <CircularProgress size={14} thickness={4} sx={{ color: '#22c55e' }} />
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

const cardSx      = { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' };
const cardHeaderSx = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', borderBottom: '1px solid #334155',
    background: 'rgba(255,255,255,0.02)'
};
const iconSx      = {
    width: 26, height: 26, borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
};
const cardTitleSx   = { fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' };
const caseSx        = {
    background:    'rgba(255,255,255,0.025)',
    border:        '1px solid #334155',
    borderRadius:  '7px',
    padding:       '8px 10px',
    marginBottom:  '6px',
    '&:last-of-type': { marginBottom: 0 }
};
const caseNumberSx  = { fontSize: '0.68rem', fontWeight: 700, color: '#0ea5e9' };
const caseSubjectSx = { fontSize: '0.76rem', fontWeight: 600, color: '#e2e8f0' };
const badgeSx       = (color: string) => ({
    fontSize: '0.55rem', fontWeight: 700, height: '18px',
    color, background: `${color}18`,
    '& .MuiChip-label': { padding: '0 6px' }
});
