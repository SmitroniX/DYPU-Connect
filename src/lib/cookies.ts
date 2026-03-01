// ---------------------------------------------------------------------------
// Cookie Management — CrowdStrike Falcon-inspired security layer
//
// Uses the open-source `cookies-next` package for cookie get/set with
// enterprise-grade defaults: Secure, SameSite=Strict, HttpOnly-safe flags.
//
// Cookie categories follow GDPR/privacy-by-design patterns:
//   • essential  – Required for the app to function (auth, session).
//                  Cannot be declined.
//   • analytics  – Firebase Analytics, performance monitoring.
//   • functional – Preferences like theme, compact mode, etc.
// ---------------------------------------------------------------------------

import { getCookie, setCookie, deleteCookie } from 'cookies-next';

/* ── Cookie category types ────────────────────────── */

export type CookieCategory = 'essential' | 'analytics' | 'functional';

export interface CookieConsent {
    essential: true;       // Always true — cannot be toggled off
    analytics: boolean;
    functional: boolean;
    consentedAt: number;   // Unix timestamp
    version: number;       // Bump when policy changes
}

/* ── Constants ────────────────────────────────────── */

export const CONSENT_COOKIE_NAME = 'dypu_cookie_consent';
export const CONSENT_VERSION = 1;

/** Max-age: 365 days in seconds */
const CONSENT_MAX_AGE = 365 * 24 * 60 * 60;

/** Hardened cookie options — CrowdStrike/Falcon-style security defaults */
const SECURE_COOKIE_OPTS = {
    maxAge: CONSENT_MAX_AGE,
    path: '/',
    sameSite: 'strict' as const,
    // Secure flag ensures cookies only sent over HTTPS (prevents sniffing on HTTP)
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
};

/* ── Read consent ─────────────────────────────────── */

export function getConsent(): CookieConsent | null {
    try {
        const raw = getCookie(CONSENT_COOKIE_NAME);
        if (!raw) return null;

        const parsed: CookieConsent = JSON.parse(
            typeof raw === 'string' ? raw : String(raw)
        );

        // If version has changed since user consented, treat as un-consented
        if (parsed.version !== CONSENT_VERSION) return null;

        return {
            essential: true,
            analytics: !!parsed.analytics,
            functional: !!parsed.functional,
            consentedAt: parsed.consentedAt,
            version: parsed.version,
        };
    } catch {
        return null;
    }
}

/* ── Write consent ────────────────────────────────── */

export function saveConsent(prefs: Pick<CookieConsent, 'analytics' | 'functional'>): CookieConsent {
    const consent: CookieConsent = {
        essential: true,
        analytics: prefs.analytics,
        functional: prefs.functional,
        consentedAt: Date.now(),
        version: CONSENT_VERSION,
    };

    setCookie(CONSENT_COOKIE_NAME, JSON.stringify(consent), SECURE_COOKIE_OPTS);

    // If analytics was declined, clean up any analytics cookies
    if (!consent.analytics) {
        purgeAnalyticsCookies();
    }

    return consent;
}

/* ── Accept all ───────────────────────────────────── */

export function acceptAllCookies(): CookieConsent {
    return saveConsent({ analytics: true, functional: true });
}

/* ── Decline non-essential ────────────────────────── */

export function declineNonEssentialCookies(): CookieConsent {
    return saveConsent({ analytics: false, functional: false });
}

/* ── Revoke consent (GDPR right to withdraw) ──────── */

export function revokeConsent(): void {
    deleteCookie(CONSENT_COOKIE_NAME, { path: '/' });
    purgeAnalyticsCookies();
    purgeFunctionalCookies();
}

/* ── Category helpers ─────────────────────────────── */

export function isAnalyticsAllowed(): boolean {
    return getConsent()?.analytics === true;
}

export function isFunctionalAllowed(): boolean {
    return getConsent()?.functional === true;
}

export function hasConsented(): boolean {
    return getConsent() !== null;
}

/* ── Purge helpers ────────────────────────────────── */

/** Remove known Google Analytics / Firebase Analytics cookies */
function purgeAnalyticsCookies() {
    const analyticsPatterns = ['_ga', '_gid', '_gat', '__utma', '__utmb', '__utmc', '__utmz'];
    analyticsPatterns.forEach((name) => {
        deleteCookie(name, { path: '/' });
        deleteCookie(name, { path: '/', domain: `.${window.location.hostname}` });
    });
}

/** Remove functional / preference cookies */
function purgeFunctionalCookies() {
    deleteCookie('dypu_settings_v1', { path: '/' });
}

/* ── Secure cookie setter for app-level cookies ───── */

export function setSecureCookie(name: string, value: string, maxAge?: number) {
    setCookie(name, value, {
        ...SECURE_COOKIE_OPTS,
        ...(maxAge !== undefined ? { maxAge } : {}),
    });
}

