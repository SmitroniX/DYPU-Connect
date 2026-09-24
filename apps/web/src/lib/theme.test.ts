import { describe, it, expect, beforeEach } from 'vitest';
import {
    hexToRgb,
    getLuminance,
    computeAccentTokens,
    applyAccentColor,
    getSavedAccentColor,
    ACCENT_PRESETS,
    DEFAULT_ACCENT_COLOR,
    STORAGE_KEY_ACCENT,
} from './theme';

describe('theme utilities', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.style.removeProperty('--ui-accent');
        document.documentElement.style.removeProperty('--ui-accent-hover');
        document.documentElement.style.removeProperty('--ui-accent-dim');
        document.documentElement.style.removeProperty('--ui-accent-text');
    });

    describe('hexToRgb', () => {
        it('parses valid 6-digit hex colors', () => {
            expect(hexToRgb('#6366F1')).toEqual({ r: 99, g: 102, b: 241 });
            expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
            expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
        });

        it('parses valid 3-digit hex colors', () => {
            expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
            expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
        });

        it('handles hex without # prefix', () => {
            expect(hexToRgb('10B981')).toEqual({ r: 16, g: 185, b: 129 });
        });

        it('returns null for invalid hex values', () => {
            expect(hexToRgb('invalid')).toBeNull();
            expect(hexToRgb('#12345')).toBeNull();
            expect(hexToRgb('#1234567')).toBeNull();
        });
    });

    describe('getLuminance', () => {
        it('calculates 0 for pure black', () => {
            expect(getLuminance(0, 0, 0)).toBeCloseTo(0, 4);
        });

        it('calculates 1 for pure white', () => {
            expect(getLuminance(255, 255, 255)).toBeCloseTo(1, 4);
        });
    });

    describe('computeAccentTokens', () => {
        it('returns preset tokens directly when matching an existing preset', () => {
            const indigoPreset = ACCENT_PRESETS[0];
            const tokens = computeAccentTokens('#6366F1');
            expect(tokens.value).toBe(indigoPreset.value);
            expect(tokens.hover).toBe(indigoPreset.hover);
            expect(tokens.dim).toBe(indigoPreset.dim);
            expect(tokens.text).toBe(indigoPreset.text);
        });

        it('derives high-contrast light text for dark custom colors', () => {
            const darkNavyTokens = computeAccentTokens('#0f172a');
            expect(darkNavyTokens.text).toBe('#FFFFFF');
        });

        it('derives high-contrast dark text for light custom colors', () => {
            const lightYellowTokens = computeAccentTokens('#facc15');
            expect(lightYellowTokens.text).toBe('#09090B');
        });

        it('falls back to default preset on malformed color', () => {
            const fallbackTokens = computeAccentTokens('not-a-color');
            expect(fallbackTokens.value).toBe(DEFAULT_ACCENT_COLOR);
        });
    });

    describe('applyAccentColor & getSavedAccentColor', () => {
        it('applies CSS variables to document.documentElement and saves to localStorage', () => {
            applyAccentColor('#10B981');

            expect(document.documentElement.style.getPropertyValue('--ui-accent')).toBe('#10B981');
            expect(document.documentElement.style.getPropertyValue('--ui-accent-text')).toBe('#FFFFFF');
            expect(localStorage.getItem(STORAGE_KEY_ACCENT)).toBe('#10B981');
            expect(getSavedAccentColor()).toBe('#10B981');
        });

        it('returns default accent color when no color is saved in localStorage', () => {
            expect(getSavedAccentColor()).toBe(DEFAULT_ACCENT_COLOR);
        });
    });
});
