import React from 'react';
import { Box, Chip, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import PersonIcon           from '@mui/icons-material/Person';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AssignmentIcon       from '@mui/icons-material/Assignment';
import HelpOutlineIcon      from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import { CustomerIntel } from '../models/interfaces/params';

interface Props {
    data:        CustomerIntel | null;
    loading:     boolean;
    error:       string | null;
    contactInfo: string;
    mediaType:   string;
}

// Maps Genesys mediaType values to emoji icons for quick visual recognition
const MEDIA_ICON: Record<string, string> = {
    voice: '📞', email: '✉️', webmessaging: '💬', chat: '💬',
    whatsapp: '📱', sms: '📱'
};

/**
 * CustomerIntelCard — displays AI-analyzed customer intelligence for the active interaction.
 *
 * Shows: customer name, contact info, request type (new/existing case), and a transcript excerpt.
 * The card body is collapsible — click the chevron icon in the header to toggle.
 *
 * Data comes from the useTranscriptAnalysis hook (via App.tsx).
 */
export const CustomerIntelCard = ({ data, loading, error, contactInfo, mediaType }: Props) => {
    // Start collapsed; auto-expand when meaningful data arrives
    const [collapsed, setCollapsed] = React.useState(true);

    React.useEffect(() => {
        if (data && (data.requestType !== 'unknown' || data.requestSummary || data.excerpt || data.customerName)) {
            setCollapsed(false);
        }
    }, [data]);

    return (
        <Box sx={cardSx}>
            {/* Header — always visible, contains title + status badge + collapse toggle */}
            <Box sx={cardHeaderSx}>
                <Box sx={{ ...iconSx, background: 'rgba(14,165,233,0.15)' }}>
                    <PersonIcon sx={{ fontSize: '14px', color: '#0ea5e9' }} />
                </Box>
                <Typography sx={cardTitleSx}>Customer Intelligence</Typography>
                {/* Sub-label pushed to the right by marginLeft: 'auto' on cardSubSx */}
                <Typography sx={cardSubSx}>
                    {MEDIA_ICON[mediaType] || '🔗'} {mediaType || '—'}
                </Typography>
                <StatusBadge loading={loading} hasData={!!data} error={!!error} />
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
                    {loading && <LoadingRow label="Analisi transcript in corso..." />}

                    {!loading && error && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#ef4444' }}>
                            ⚠ {error}
                        </Typography>
                    )}

                    {!loading && !error && !data && (
                        <EmptyState icon="🎤" label="Nessun dato estratto dal transcript" />
                    )}

                    {!loading && data && (
                        <Stack gap="8px">
                            {/* Two-column grid: customer name on the left, contact on the right */}
                            <Box sx={intelGridSx}>
                                <IntelField label="Nome Cliente" value={data.customerName} />
                                <IntelField label="Contatto"     value={data.contact || contactInfo} />
                            </Box>

                            {/* Request type + Gemini summary */}
                            <Box sx={intelFieldFullSx}>
                                <Typography sx={intelLabelSx}>Tipo Richiesta</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', mb: data.requestSummary ? '6px' : 0 }}>
                                    <RequestTypeChip type={data.requestType} caseRef={data.caseNumber} />
                                </Box>
                                {/* Gemini summary — prominent block below the chip */}
                                {data.requestSummary && (
                                    <Box sx={requestSummaryBoxSx}>
                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#818cf8',
                                            textTransform: 'uppercase', letterSpacing: '0.5px', mb: '3px' }}>
                                            ✦ Gemini AI
                                        </Typography>
                                        <Typography sx={requestSummaryTextSx}>
                                            {data.requestSummary}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Transcript excerpt — scrollable monospace text box */}
                            {data.excerpt && (
                                <Box sx={intelFieldFullSx}>
                                    <Typography sx={intelLabelSx}>Estratto Transcript</Typography>
                                    <Box sx={transcriptBoxSx}>{data.excerpt}</Box>
                                </Box>
                            )}
                        </Stack>
                    )}
                </Box>
            )}
        </Box>
    );
};

// ── Sub-components ────────────────────────────────────────────────

/**
 * Colored chip indicating what type of request was detected in the transcript.
 * - new_case:      red — customer wants to open a new ticket
 * - existing_case: green — customer is following up on an existing ticket
 * - unknown:       gray — could not determine the request type
 */
const RequestTypeChip = ({ type, caseRef }: { type: CustomerIntel['requestType']; caseRef?: string }) => {
    if (type === 'new_case') {
        return (
            <Chip icon={<AddCircleOutlineIcon />} label="Nuovo Case"
                sx={{ fontSize: '0.72rem', fontWeight: 700, height: '26px',
                    background: 'rgba(239,68,68,0.15)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.4)',
                    '& .MuiChip-icon': { color: '#f87171', fontSize: '16px' } }} />
        );
    }
    if (type === 'existing_case') {
        return (
            <Chip icon={<AssignmentIcon />} label={caseRef || 'Case esistente'}
                sx={{ fontSize: '0.72rem', fontWeight: 700, height: '26px',
                    background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                    border: '1px solid rgba(34,197,94,0.4)',
                    '& .MuiChip-icon': { color: '#4ade80', fontSize: '16px' } }} />
        );
    }
    return (
        <Chip icon={<HelpOutlineIcon />} label="In analisi..."
            sx={{ fontSize: '0.72rem', fontWeight: 600, height: '26px',
                background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                '& .MuiChip-icon': { color: '#94a3b8', fontSize: '16px' } }} />
    );
};

/** Displays a label + value pair inside a subtle bordered box */
const IntelField = ({ label, value }: { label: string; value: string }) => (
    <Box sx={intelFieldSx}>
        <Typography sx={intelLabelSx}>{label}</Typography>
        <Typography sx={intelValueSx}>{value || '—'}</Typography>
    </Box>
);

/** Color-coded status badge in the card header */
const StatusBadge = ({ loading, hasData, error }: { loading: boolean; hasData: boolean; error: boolean }) => {
    if (loading) return <Chip label="LIVE" size="small" sx={badgeSx('#ef4444', 'rgba(239,68,68,0.15)')} />;
    if (error)   return <Chip label="ERR"  size="small" sx={badgeSx('#f59e0b', 'rgba(245,158,11,0.15)')} />;
    if (hasData) return <Chip label="OK"   size="small" sx={badgeSx('#22c55e', 'rgba(34,197,94,0.15)')} />;
    return               <Chip label="IDLE" size="small" sx={badgeSx('#94a3b8', 'rgba(148,163,184,0.1)')} />;
};

/** Spinner row shown while data is being fetched */
const LoadingRow = ({ label }: { label: string }) => (
    <Stack direction="row" alignItems="center" gap="8px" padding="10px 0"
        sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
        <CircularProgress size={14} thickness={4} sx={{ color: '#0ea5e9' }} />
        {label}
    </Stack>
);

/** Centered placeholder shown when there is no data to display */
const EmptyState = ({ icon, label }: { icon: string; label: string }) => (
    <Stack alignItems="center" padding="16px 0" gap="4px"
        sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
        <span style={{ fontSize: '1.6rem', opacity: 0.35 }}>{icon}</span>
        {label}
    </Stack>
);

// ── Styles ────────────────────────────────────────────────────────

const cardSx = {
    background:   '#1e293b',
    border:       '1px solid #334155',
    borderRadius: '10px',
    overflow:     'hidden'
};

const cardHeaderSx = {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    padding:      '8px 12px',
    borderBottom: '1px solid #334155',
    background:   'rgba(255,255,255,0.02)'
};

const iconSx = {
    width: 26, height: 26, borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
};

const cardTitleSx = { fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' };
// marginLeft: 'auto' pushes this element and everything after it to the far right
const cardSubSx   = { fontSize: '0.62rem', color: '#94a3b8', marginLeft: 'auto' };

const intelGridSx = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' };

const intelFieldSx = {
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid #334155',
    borderRadius: '6px',
    padding:      '7px 9px'
};

const intelFieldFullSx = {
    ...intelFieldSx,
    gridColumn: '1 / -1' // spans all columns in the grid
};

const intelLabelSx = {
    fontSize:      '0.58rem',
    fontWeight:    600,
    color:         '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom:  '3px'
};

const intelValueSx = {
    fontSize:  '0.8rem',
    fontWeight: 600,
    color:     '#e2e8f0',
    wordBreak: 'break-all' as const
};

const transcriptBoxSx = {
    fontSize:     '0.68rem',
    color:        '#94a3b8',
    lineHeight:   1.5,
    maxHeight:    '80px',
    overflowY:    'auto' as const,
    background:   'rgba(0,0,0,0.2)',
    borderRadius: '4px',
    padding:      '5px 7px',
    fontFamily:   'Consolas, monospace'
};

const badgeSx = (color: string, bg: string) => ({
    fontSize: '0.55rem', fontWeight: 700, height: '18px',
    color, background: bg,
    '& .MuiChip-label': { padding: '0 6px' }
});

// Gemini summary container — subtle indigo box below the request type chip
const requestSummaryBoxSx = {
    background:   'rgba(99,102,241,0.08)',
    border:       '1px solid rgba(99,102,241,0.25)',
    borderRadius: '6px',
    padding:      '6px 9px',
    marginTop:    '4px'
};

const requestSummaryTextSx = {
    fontSize:   '0.82rem',
    fontStyle:  'italic',
    color:      '#c7d2fe',
    fontWeight: 500,
    lineHeight: 1.4
};
