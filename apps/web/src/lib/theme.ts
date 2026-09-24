/**
 * DYPU-Connect UI Accent Color & Theme Customization System
 * Manages user-selected accent colors, contrast token derivation,
 * and DOM CSS variable injection.
 */

export interface AccentColorPreset {
    id: string;
    name: string;
    value: string; // Hex format e.g. #6366F1
    hover: string;
    dim: string;
    text: string;
}

export const ACCENT_PRESETS: AccentColorPreset[] = [
    {
        id: 'indigo',
        name: 'Royal Indigo',
        value: '#6366F1',
        hover: '#4F46E5',
        dim: 'rgba(99, 102, 241, 0.15)',
        text: '#FFFFFF',
    },
    {
        id: 'violet',
        name: 'Cyber Violet',
        value: '#8B5CF6',
        hover: '#7C3AED',
        dim: 'rgba(139, 92, 246, 0.15)',
        text: '#FFFFFF',
    },
    {
        id: 'emerald',
        name: 'Campus Emerald',
        value: '#10B981',
        hover: '#059669',
        dim: 'rgba(16, 185, 129, 0.15)',
        text: '#FFFFFF',
    },
    {
        id: 'cyan',
        name: 'Ocean Cyan',
        value: '#06B6D4',
        hover: '#0891B2',
        dim: 'rgba(6, 182, 212, 0.15)',
        text: '#FFFFFF',
    },
    {
        id: 'rose',
        name: 'Sunset Rose',
        value: '#F43F5E',
        hover: '#E11D48',
        dim: 'rgba(244, 63, 94, 0.15)',
        text: '#FFFFFF',
    },
    {
        id: 'amber',
        name: 'Golden Amber',
        value: '#F59E0B',
        hover: '#D97706',
        dim: 'rgba(245, 158, 11, 0.15)',
        text: '#09090B',
    },
    {
        id: 'blue',
        name: 'Electric Blue',
        value: '#3B82F6',
        hover: '#2563EB',
        dim: 'rgba(59, 130, 246, 0.15)',
        text: '#FFFFFF',
    },
];

export const STORAGE_KEY_ACCENT = 'dypu_accent_color';
export const DEFAULT_ACCENT_COLOR = '#6366F1';

/**
 * Converts a 3 or 6 digit hex color to RGB tuple
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const cleanHex = hex.replace('#', '').trim();
    if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        return null;
    }

    let r = 0, g = 0, b = 0;
    if (cleanHex.length === 3) {
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else {
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
    }

    return { r, g, b };
}

/**
 * Calculates the relative luminance of an sRGB color (per WCAG 2.1)
 */
export function getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Computes contrast-safe tokens (hover, dim, text contrast) for any custom hex
 */
export function computeAccentTokens(hex: string): {
    value: string;
    hover: string;
    dim: string;
    text: string;
} {
    // Check if it's already one of our presets for calibrated precision
    const matchingPreset = ACCENT_PRESETS.find(p => p.value.toLowerCase() === hex.toLowerCase());
    if (matchingPreset) {
        return {
            value: matchingPreset.value,
            hover: matchingPreset.hover,
            dim: matchingPreset.dim,
            text: matchingPreset.text,
        };
    }

    const rgb = hexToRgb(hex);
    if (!rgb) {
        const defaultPreset = ACCENT_PRESETS[0];
        return {
            value: defaultPreset.value,
            hover: defaultPreset.hover,
            dim: defaultPreset.dim,
            text: defaultPreset.text,
        };
    }

    // Slightly darken or lighten for hover state
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    const hoverFactor = luminance > 0.4 ? 0.85 : 1.15;
    const hoverR = Math.min(255, Math.max(0, Math.round(rgb.r * hoverFactor)));
    const hoverG = Math.min(255, Math.max(0, Math.round(rgb.g * hoverFactor)));
    const hoverB = Math.min(255, Math.max(0, Math.round(rgb.b * hoverFactor)));
    const hoverHex = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;

    // Dim background token (15% opacity)
    const dimRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;

    // Accessible text color based on WCAG luminance threshold
    const textContrast = luminance > 0.45 ? '#09090B' : '#FFFFFF';

    return {
        value: hex.startsWith('#') ? hex : `#${hex}`,
        hover: hoverHex,
        dim: dimRgba,
        text: textContrast,
    };
}

/**
 * Injects CSS variables directly onto document.documentElement
 */
export function applyAccentColor(hexColor: string): void {
    if (typeof document === 'undefined') return;

    const tokens = computeAccentTokens(hexColor);
    const root = document.documentElement;

    root.style.setProperty('--ui-accent', tokens.value);
    root.style.setProperty('--ui-accent-hover', tokens.hover);
    root.style.setProperty('--ui-accent-dim', tokens.dim);
    root.style.setProperty('--ui-accent-text', tokens.text);

    try {
        localStorage.setItem(STORAGE_KEY_ACCENT, tokens.value);
    } catch {
        // Handle private browsing or storage quota issues silently
    }
}

/**
 * Retrieves the currently saved accent color, or falls back to default
 */
export function getSavedAccentColor(): string {
    if (typeof window === 'undefined') return DEFAULT_ACCENT_COLOR;
    try {
        const saved = localStorage.getItem(STORAGE_KEY_ACCENT);
        if (saved && hexToRgb(saved)) {
            return saved;
        }
    } catch {
        // Ignore storage exceptions
    }
    return DEFAULT_ACCENT_COLOR;
}
