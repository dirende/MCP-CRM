import React from 'react';
import { Box, Chip, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import PersonIcon           from '@mui/icons-material/Person';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AssignmentIcon       from '@mui/icons-material/Assignment';
import HelpOutlineIcon      from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon     from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon      from '@mui/icons-material/AutoAwesome';
import PsychologyIcon       from '@mui/icons-material/Psychology';
import { CustomerIntel } from '../models/interfaces/params';

interface Props {
    data:          CustomerIntel | null;
    loading:       boolean;
    error:         string | null;
    contactInfo:   string;
    mediaType:     string;
    caseUrl?:      string;        // URL to open for existing_case / check_status / close_case
    onCreateCase?: () => void;    // callback to create a new case
}

const MEDIA_ICON: Record<string, string> = {
    voice: '📞', email: '✉️', webmessaging: '💬', chat: '💬',
    whatsapp: '📱', sms: '📱'
};

/** Which AI engine label + color to show */
const AI_ENGINE: Record<string, { label: string; color: string; bg: string }> = {
    claude:    { label: 'Claude AI',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    gemini:    { label: 'Gemini AI',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    heuristic: { label: 'Heuristic',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
};

export const CustomerIntelCard = ({ data, loading, error, contactInfo, mediaType, caseUrl, onCreateCase }: Props) => {
    const [collapsed, setCollapsed] = React.useState(true);

    React.useEffect(() => {
        if (data && (data.requestType !== 'unknown' || data.requestSummary || data.excerpt || data.customerName)) {
            setCollapsed(false);
        }
    }, [data]);

    const engine = data?.aiEngine ? (AI_ENGINE[data.aiEngine] || AI_ENGINE.heuristic) : null;

    return (
        <Box sx={cardSx}>
            {/* ── Header ── */}
            <Box sx={cardHeaderSx}>
                <Box sx={{ ...iconSx, background: 'rgba(14,165,233,0.15)' }}>
                    <PersonIcon sx={{ fontSize: '14px', color: '#0ea5e9' }} />
                </Box>
                <Typography sx={cardTitleSx}>Customer Intelligence</Typography>

                {/* AI thinking animation — shown while loading */}
                {loading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', ml: '6px' }}>
                        <AutoAwesomeIcon sx={{
                            fontSize: '13px', color: '#818cf8',
                            animation: 'aiPulse 1.2s ease-in-out infinite',
                            '@keyframes aiPulse': {
                                '0%,100%': { opacity: 1, transform: 'scale(1)' },
                                '50%':     { opacity: 0.3, transform: 'scale(0.8)' }
                            }
                        }} />
                        <Typography sx={{ fontSize: '0.58rem', color: '#818cf8', fontStyle: 'italic' }}>
                            AI analysis...
                        </Typography>
                    </Box>
                )}

                <Typography sx={cardSubSx}>
                    {MEDIA_ICON[mediaType] || '🔗'} {mediaType || '—'}
                </Typography>
                <StatusBadge loading={loading} hasData={!!data} error={!!error} />
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

            {/* ── Body ── */}
            {!collapsed && (
                <Box sx={{ padding: '10px 12px', maxHeight: '320px', overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#475569', borderRadius: '4px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: '#64748b' }
                }}>
                    {loading && <LoadingRow label="AI analysis in progress..." />}

                    {!loading && error && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#ef4444' }}>⚠ {error}</Typography>
                    )}

                    {!loading && !error && !data && (
                        <EmptyState icon="🎤" label="No data extracted from transcript" />
                    )}

                    {!loading && data && (
                        <Stack gap="8px">
                            {/* Customer name + contact */}
                            <Box sx={intelGridSx}>
                                <IntelField label="Customer Name" value={data.customerName} />
                                <IntelField label="Contact"       value={data.contact || contactInfo} />
                            </Box>

                            {/* Tipo Richiesta — chip + AI engine badge on same row */}
                            <Box sx={intelFieldFullSx}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '6px' }}>
                                    <Typography sx={intelLabelSx}>Request Type</Typography>
                                    {/* AI engine badge — top right of the field */}
                                    {engine && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px',
                                            background: engine.bg, borderRadius: '4px',
                                            padding: '2px 6px', border: `1px solid ${engine.color}33` }}>
                                            <PsychologyIcon sx={{ fontSize: '10px', color: engine.color }} />
                                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700,
                                                color: engine.color, letterSpacing: '0.3px' }}>
                                                {engine.label}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                <RequestTypeChip
                                    type={data.requestType}
                                    caseRef={data.caseNumber}
                                    onClick={
                                        (data.requestType === 'existing_case' || data.requestType === 'check_status' || data.requestType === 'close_case') && caseUrl
                                            ? () => window.open(caseUrl, '_blank')
                                            : data.requestType === 'new_case' && onCreateCase
                                            ? onCreateCase
                                            : undefined
                                    }
                                />

                                {/* AI summary */}
                                {data.requestSummary && (
                                    <Box sx={requestSummaryBoxSx}>
                                        <Typography sx={requestSummaryTextSx}>
                                            {data.requestSummary}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* AI suggestion — action hint from AI */}
                            {data.agentSuggestion && (
                                <Box sx={agentSuggestionBoxSx}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mb: '3px' }}>
                                        <AutoAwesomeIcon sx={{ fontSize: '11px', color: '#818cf8' }} />
                                        <Typography sx={{ fontSize: '0.58rem', fontWeight: 700,
                                            color: '#818cf8', textTransform: 'uppercase',
                                            letterSpacing: '0.4px' }}>
                                            AI Suggestion
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8',
                                        lineHeight: 1.45 }}>
                                        {data.agentSuggestion}
                                    </Typography>
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

const RequestTypeChip = ({ type, caseRef, onClick }: {
    type:     CustomerIntel['requestType'];
    caseRef?: string;
    onClick?: () => void;
}) => {
    const clickable = !!onClick;
    const clickSx = clickable ? {
        cursor: 'pointer',
        '&:hover': { filter: 'brightness(1.25)', transform: 'translateY(-1px)' },
        transition: 'all 0.15s ease'
    } : {};

    if (type === 'new_case') {
        return (
            <Chip icon={<AddCircleOutlineIcon />}
                label={clickable ? '+ Create new Incident →' : 'New Incident'}
                onClick={onClick}
                title={clickable ? 'Create new case in ServiceNow' : undefined}
                sx={{ fontSize: '0.72rem', fontWeight: 700, height: '26px',
                    background: 'rgba(239,68,68,0.15)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.4)',
                    '& .MuiChip-icon': { color: '#f87171', fontSize: '16px' },
                    ...clickSx }} />
        );
    }
    if (type === 'existing_case') {
        return (
            <Chip icon={<AssignmentIcon />}
                label={caseRef ? `${caseRef} ↗` : 'Existing Incident'}
                onClick={onClick}
                title={clickable ? 'Open in ServiceNow' : undefined}
                sx={{ fontSize: '0.72rem', fontWeight: 700, height: '26px',
                    background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                    border: '1px solid rgba(34,197,94,0.4)',
                    '& .MuiChip-icon': { color: '#4ade80', fontSize: '16px' },
                    ...clickSx }} />
        );
    }
    if (type === 'check_status') {
        return (
            <Chip icon={<InfoOutlinedIcon />}
                label={caseRef ? `Status ${caseRef} ↗` : 'Check ticket status'}
                onClick={onClick}
                title={clickable ? 'Open ticket in ServiceNow' : undefined}
                sx={{ fontSize: '0.72rem', fontWeight: 700, height: '26px',
                    background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.4)',
                    '& .MuiChip-icon': { color: '#fbbf24', fontSize: '16px' },
                    ...clickSx }} />
        );
    }
    if (type === 'close_case') {
        return (
            <Chip icon={<CheckCircleOutlineIcon />}
                label={caseRef ? `Close ${caseRef} ↗` : 'Close ticket'}
                onClick={onClick}
                title={clickable ? 'Open ticket to close in ServiceNow' : undefined}
                sx={{ fontSize: '0.72rem', fontWeight: 700, height: '26px',
                    background: 'rgba(168,85,247,0.15)', color: '#c084fc',
                    border: '1px solid rgba(168,85,247,0.4)',
                    '& .MuiChip-icon': { color: '#c084fc', fontSize: '16px' },
                    ...clickSx }} />
        );
    }
    return (
        <Chip icon={<HelpOutlineIcon />} label="Analyzing..."
            sx={{ fontSize: '0.72rem', fontWeight: 600, height: '26px',
                background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                '& .MuiChip-icon': { color: '#94a3b8', fontSize: '16px' } }} />
    );
};

const IntelField = ({ label, value }: { label: string; value: string }) => (
    <Box sx={intelFieldSx}>
        <Typography sx={intelLabelSx}>{label}</Typography>
        <Typography sx={intelValueSx}>{value || '—'}</Typography>
    </Box>
);

const StatusBadge = ({ loading, hasData, error }: { loading: boolean; hasData: boolean; error: boolean }) => {
    if (loading) return <Chip label="LIVE" size="small" sx={badgeSx('#ef4444', 'rgba(239,68,68,0.15)')} />;
    if (error)   return <Chip label="ERR"  size="small" sx={badgeSx('#f59e0b', 'rgba(245,158,11,0.15)')} />;
    if (hasData) return <Chip label="OK"   size="small" sx={badgeSx('#22c55e', 'rgba(34,197,94,0.15)')} />;
    return               <Chip label="IDLE" size="small" sx={badgeSx('#94a3b8', 'rgba(148,163,184,0.1)')} />;
};

const LoadingRow = ({ label }: { label: string }) => (
    <Stack direction="row" alignItems="center" gap="8px" padding="10px 0"
        sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
        <CircularProgress size={14} thickness={4} sx={{ color: '#818cf8' }} />
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

const cardSx = {
    background:   '#1e293b',
    border:       '1px solid #334155',
    borderRadius: '10px',
    overflow:     'clip'
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
    gridColumn: '1 / -1'
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

/** Summary text — indigo left-border accent, clean and readable */
const requestSummaryBoxSx = {
    borderLeft:   '3px solid rgba(129,140,248,0.6)',
    paddingLeft:  '8px',
    marginTop:    '8px',
};

const requestSummaryTextSx = {
    fontSize:   '0.8rem',
    fontStyle:  'italic',
    color:      '#c7d2fe',
    fontWeight: 500,
    lineHeight: 1.5
};

/** AI suggestion box — indigo left-border accent */
const agentSuggestionBoxSx = {
    background:   'rgba(129,140,248,0.05)',
    border:       '1px solid rgba(129,140,248,0.2)',
    borderLeft:   '3px solid rgba(129,140,248,0.6)',
    borderRadius: '0 6px 6px 0',
    padding:      '7px 10px',
};
