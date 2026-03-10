import React, { MouseEventHandler } from 'react';
import CloseIcon      from '@mui/icons-material/Close';
import RefreshIcon    from '@mui/icons-material/Refresh';
import Box            from '@mui/material/Box';
import IconButton     from '@mui/material/IconButton';
import Typography     from '@mui/material/Typography';
import HeadphonesIcon from '@mui/icons-material/Headphones';

interface CloseBarProps {
    title:            string;
    backgroundColor?: string;
    color?:           string;
    onClose?:         MouseEventHandler<HTMLButtonElement>;
    onReset?:         () => void;
}

/**
 * CloseBar — sticky header displayed at the top of the SmartUI widget.
 *
 * Contains:
 *  - A branded logo icon (headphones on a gradient background)
 *  - The widget title (configurable via params)
 *  - A close button that optionally focuses the PEF iframe and calls onClose
 *
 * Sticky positioning (top: 0) keeps this bar visible when the card list scrolls.
 */
export const CloseBar = ({
    title,
    backgroundColor = '#0c1524',
    color           = '#e2e8f0',
    onClose,
    onReset
}: CloseBarProps) => {

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        // Return focus to the PEF frame so keyboard shortcuts still work after close
        document.getElementById('pureFrame')?.focus();
        if (onClose) onClose(event);
    };

    return (
        <Box sx={{
            backgroundColor,
            borderBottom: '1px solid #334155',
            display:      'flex',
            alignItems:   'center',
            padding:      '0 10px',
            height:       '40px',
            flexShrink:   0,    // prevents bar from shrinking in a flex column layout
            position:     'sticky',
            top:          0,
            zIndex:       10    // stays above scrolled card content
        }}>
            {/* Brand logo — gradient square with headphones icon */}
            <Box sx={{
                width: 24, height: 24, borderRadius: '6px',
                background:     'linear-gradient(135deg,#0ea5e9,#6366f1)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
                marginRight:    '8px'
            }}>
                <HeadphonesIcon sx={{ fontSize: '14px', color: '#fff' }} />
            </Box>

            {/* Widget title — flex: 1 fills the remaining space */}
            <Typography variant="body2" sx={{
                flex:          1,
                color,
                fontSize:      '0.78rem',
                fontWeight:    700,
                letterSpacing: '-0.2px'
            }}>
                {title}
            </Typography>

            {/* Version badge */}
            <Typography sx={{
                fontSize:     '0.68rem',
                color:        '#64748b',
                fontWeight:   700,
                marginRight:  '6px',
                fontFamily:   'monospace'
            }}>
                v34
            </Typography>

            {/* Reset button — only shown when onReset is provided */}
            {onReset && (
                <IconButton
                    size="small"
                    onClick={onReset}
                    aria-label="reset"
                    title="↺ Reset"
                    sx={{
                        padding: '3px',
                        color: '#64748b',
                        marginRight: '2px',
                        '&:hover': { backgroundColor: 'rgba(148,163,184,0.12)', color: '#94a3b8' }
                    }}
                >
                    <RefreshIcon sx={{ fontSize: '16px' }} />
                </IconButton>
            )}

            {/* Close button — turns red on hover for clear affordance */}
            <IconButton
                size="small"
                onClick={handleClick}
                aria-label="close"
                sx={{
                    padding: '3px',
                    color,
                    '&:hover': { backgroundColor: '#ef4444', color: '#fff' }
                }}
            >
                <CloseIcon sx={{ fontSize: '16px' }} />
            </IconButton>
        </Box>
    );
};
