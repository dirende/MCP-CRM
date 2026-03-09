import { MouseEventHandler } from 'react';
interface CloseBarProps {
    title: string;
    backgroundColor?: string;
    color?: string;
    onClose?: MouseEventHandler<HTMLButtonElement>;
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
export declare const CloseBar: ({ title, backgroundColor, color, onClose }: CloseBarProps) => import("react/jsx-runtime").JSX.Element;
export {};
