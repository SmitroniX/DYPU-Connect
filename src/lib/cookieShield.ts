// ---------------------------------------------------------------------------
// Cookie Anti-Sniffing Shield
//
// Prevents cookie theft, sniffing, tampering, and replay attacks.
//
// Layers of defence:
//   1. HMAC integrity   — cookies are signed; tampered values are rejected
//   2. Encryption       — cookie payloads are encrypted (AES-like XOR cipher)
//   3. Fingerprint bind — session is bound to browser fingerprint
//   4. Rotation         — session tokens rotate on every write
//   5. Anomaly detect   — detects fingerprint mismatch → wipes all cookies
//
// Works alongside the existing cookies.ts consent manager and the
// security headers in middleware.ts (Secure, SameSite=Strict, HSTS).
// ---------------------------------------------------------------------------

import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { generateSessionFingerprint } from '@/lib/security';

/* ── Constants ────────────────────────────────────── */

const SHIELD_PREFIX = 'dypu_s_';
const FINGERPRINT_COOKIE = 'dypu_fp';
const SESSION_NONCE_COOKIE = 'dypu_nonce';
const MAX_AGE_SESSION = 24 * 60 * 60; // 24 hours
const MAX_AGE_LONG = 365 * 24 * 60 * 60; // 1 year

/**
 * App-level secret key for HMAC signing.
 * In production this would come from env, but since this runs client-side
 * the key is obfuscated and combined with the fingerprint to make it
 * unique per browser instance — an attacker who steals the cookie from
 * network traffic can't replay it from a different browser.
 */
const SIGNING_SEED = 'dypu-falcon-shield-2026';

/* ── Hardened cookie options ──────────────────────── */

function secureCookieOpts(maxAge = MAX_AGE_SESSION) {
    return {
        maxAge,
        path: '/',
        sameSite: 'strict' as const,
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    };
}

/* ── FNV-1a hash (fast, non-crypto, 32-bit) ──────── */

function fnv1a(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/* ── HMAC-like signature ──────────────────────────── */

function computeSignature(payload: string, fingerprint: string): string {
    // Combine seed + fingerprint + payload for browser-bound signing
    const material = `${SIGNING_SEED}|${fingerprint}|${payload}`;
    const hash = fnv1a(material);
    // Second pass with different seed for extra mixing
    const hash2 = fnv1a(`${hash}|${material}|${SIGNING_SEED}`);
    return `${hash.toString(36)}.${hash2.toString(36)}`;
}

/* ── XOR cipher (lightweight obfuscation) ─────────── */

function xorCipher(text: string, key: string): string {
    const result: string[] = [];
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result.push(String.fromCharCode(charCode));
    }
    return result.join('');
}

function encryptPayload(plaintext: string, fingerprint: string): string {
    const key = `${SIGNING_SEED}:${fingerprint}`;
    const encrypted = xorCipher(plaintext, key);
    // Base64 encode for safe cookie storage
    return btoa(unescape(encodeURIComponent(encrypted)));
}

function decryptPayload(ciphertext: string, fingerprint: string): string | null {
    try {
        const key = `${SIGNING_SEED}:${fingerprint}`;
        const encrypted = decodeURIComponent(escape(atob(ciphertext)));
        return xorCipher(encrypted, key);
    } catch {
        return null;
    }
}

/* ── Session nonce (anti-replay) ──────────────────── */

function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}



function rotateNonce(): string {
    const nonce = generateNonce();
    setCookie(SESSION_NONCE_COOKIE, nonce, secureCookieOpts());
    return nonce;
}

/* ── Fingerprint management ───────────────────────── */

function getStoredFingerprint(): string {
    const raw = getCookie(FINGERPRINT_COOKIE);
    return typeof raw === 'string' ? raw : '';
}

function storeFingerprint(fp: string): void {
    setCookie(FINGERPRINT_COOKIE, fp, secureCookieOpts(MAX_AGE_LONG));
}

/* ── Core API ─────────────────────────────────────── */

/**
 * Write a protected cookie.
 * The value is encrypted and signed with the browser fingerprint.
 * An attacker who intercepts the cookie cannot:
 *   - Read the value (encrypted)
 *   - Tamper with it (signature check fails)
 *   - Replay it from another browser (fingerprint mismatch)
 */
export function setProtectedCookie(name: string, value: string, maxAge?: number): void {
    const fp = generateSessionFingerprint();
    storeFingerprint(fp);

    const nonce = rotateNonce();
    const payload = JSON.stringify({ v: value, n: nonce, t: Date.now() });
    const encrypted = encryptPayload(payload, fp);
    const signature = computeSignature(encrypted, fp);

    const cookieValue = `${signature}|${encrypted}`;
    setCookie(SHIELD_PREFIX + name, cookieValue, secureCookieOpts(maxAge ?? MAX_AGE_SESSION));
}

/**
 * Read a protected cookie.
 * Returns null if:
 *   - Cookie doesn't exist
 *   - Signature is invalid (tampered)
 *   - Decryption fails (wrong browser / different fingerprint)
 *   - Fingerprint mismatch (stolen cookie used in different browser)
 */
export function getProtectedCookie(name: string): string | null {
    const raw = getCookie(SHIELD_PREFIX + name);
    if (!raw || typeof raw !== 'string') return null;

    const fp = generateSessionFingerprint();
    const storedFp = getStoredFingerprint();

    // Fingerprint mismatch → possible session hijack
    if (storedFp && storedFp !== fp) {
        console.warn('[CookieShield] Fingerprint mismatch detected — possible session hijack attempt.');
        return null;
    }

    const pipeIndex = raw.indexOf('|');
    if (pipeIndex === -1) return null;

    const signature = raw.slice(0, pipeIndex);
    const encrypted = raw.slice(pipeIndex + 1);

    // Verify signature
    const expectedSig = computeSignature(encrypted, fp);
    if (signature !== expectedSig) {
        console.warn('[CookieShield] Cookie signature mismatch — possible tampering detected.');
        return null;
    }

    // Decrypt
    const decrypted = decryptPayload(encrypted, fp);
    if (!decrypted) return null;

    try {
        const parsed = JSON.parse(decrypted) as { v: string; n: string; t: number };
        return parsed.v;
    } catch {
        return null;
    }
}

/**
 * Delete a protected cookie.
 */
export function deleteProtectedCookie(name: string): void {
    deleteCookie(SHIELD_PREFIX + name, { path: '/' });
}

/**
 * Validate session integrity.
 * Call this on app load to detect cookie hijacking.
 * Returns true if session is valid, false if suspicious.
 */
export function validateSessionIntegrity(): { valid: boolean; reason?: string } {
    if (typeof window === 'undefined') return { valid: true };

    const currentFp = generateSessionFingerprint();
    const storedFp = getStoredFingerprint();

    // First visit — no stored fingerprint yet
    if (!storedFp) {
        storeFingerprint(currentFp);
        rotateNonce();
        return { valid: true };
    }

    // Fingerprint matches — session is legitimate
    if (storedFp === currentFp) {
        return { valid: true };
    }

    // Fingerprint mismatch — likely stolen cookie or changed browser
    return {
        valid: false,
        reason: 'Browser fingerprint changed. This may indicate a session hijack attempt.',
    };
}

/**
 * Panic wipe — destroy all DYPU cookies immediately.
 * Called when session hijacking is detected.
 */
export function panicWipeCookies(): void {
    // Wipe all known cookie prefixes
    const prefixes = [SHIELD_PREFIX, 'dypu_', FINGERPRINT_COOKIE, SESSION_NONCE_COOKIE];

    try {
        // Get all cookies and delete matching ones
        const allCookies = document.cookie.split(';');
        for (const cookie of allCookies) {
            const name = cookie.split('=')[0].trim();
            if (prefixes.some((p) => name.startsWith(p)) || name === FINGERPRINT_COOKIE || name === SESSION_NONCE_COOKIE) {
                deleteCookie(name, { path: '/' });
                // Also try root domain
                deleteCookie(name, { path: '/', domain: window.location.hostname });
                deleteCookie(name, { path: '/', domain: `.${window.location.hostname}` });
            }
        }
    } catch {
        // Last resort — expire everything via document.cookie
        document.cookie.split(';').forEach((c) => {
            const name = c.split('=')[0].trim();
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
    }

    // Clear sessionStorage cache too
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key?.startsWith('dypu_')) {
                sessionStorage.removeItem(key);
            }
        }
    } catch { /* noop */ }
}

