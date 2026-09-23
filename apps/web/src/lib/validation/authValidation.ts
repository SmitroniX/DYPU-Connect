/**
 * Shared authentication validation utilities.
 *
 * Centralises email normalisation and domain‑restriction logic so it can be
 * reused across the login page, AuthProvider, and any future server‑side
 * validation without duplicating rules.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The only email domain allowed for authentication. */
export const ALLOWED_DOMAIN = 'dypatil.edu';

/** Resend cooldown in seconds. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Storage key for persisting magic link send timestamp */
export const AUTH_COOLDOWN_STORAGE_KEY = 'dypu_auth_link_last_sent';
export const AUTH_ATTEMPTS_STORAGE_KEY = 'dypu_auth_link_attempts';

/** Maximum requests allowed within rate limit window (5 requests per 15 minutes) */
export const MAX_AUTH_REQUESTS_PER_WINDOW = 5;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Returns remaining cooldown in seconds based on persistent client storage.
 * Guards against page refreshes bypassing UI timers.
 */
export function getRemainingCooldown(seconds = RESEND_COOLDOWN_SECONDS): number {
    if (typeof window === 'undefined') return 0;
    try {
        const lastSentStr = window.localStorage.getItem(AUTH_COOLDOWN_STORAGE_KEY);
        if (!lastSentStr) return 0;
        const lastSent = parseInt(lastSentStr, 10);
        if (isNaN(lastSent)) return 0;
        const elapsedSeconds = Math.floor((Date.now() - lastSent) / 1000);
        const remaining = seconds - elapsedSeconds;
        return remaining > 0 ? remaining : 0;
    } catch {
        return 0;
    }
}

/**
 * Records that an auth link was just sent.
 */
export function recordAuthLinkSent(): void {
    if (typeof window === 'undefined') return;
    try {
        const now = Date.now();
        window.localStorage.setItem(AUTH_COOLDOWN_STORAGE_KEY, now.toString());

        const attemptsRaw = window.localStorage.getItem(AUTH_ATTEMPTS_STORAGE_KEY);
        const attempts: number[] = attemptsRaw ? JSON.parse(attemptsRaw) : [];
        const recentAttempts = attempts.filter((t) => now - t < AUTH_RATE_LIMIT_WINDOW_MS);
        recentAttempts.push(now);
        window.localStorage.setItem(AUTH_ATTEMPTS_STORAGE_KEY, JSON.stringify(recentAttempts));
    } catch {
        // Silently ignore storage failures
    }
}

/**
 * Checks whether client has exceeded the burst limit (max 5 requests per 15 minutes).
 */
export function checkAuthRateLimit(): { allowed: boolean; waitSeconds?: number } {
    if (typeof window === 'undefined') return { allowed: true };
    try {
        const now = Date.now();
        const attemptsRaw = window.localStorage.getItem(AUTH_ATTEMPTS_STORAGE_KEY);
        if (!attemptsRaw) return { allowed: true };
        const attempts: number[] = JSON.parse(attemptsRaw);
        const recentAttempts = attempts.filter((t) => now - t < AUTH_RATE_LIMIT_WINDOW_MS);

        if (recentAttempts.length >= MAX_AUTH_REQUESTS_PER_WINDOW) {
            const oldestInWindow = recentAttempts[0];
            const waitMs = AUTH_RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
            return {
                allowed: false,
                waitSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
            };
        }
        return { allowed: true };
    } catch {
        return { allowed: true };
    }
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Normalises an email address: trims whitespace and lowercases.
 *
 * This prevents duplicate accounts caused by `User@Dypatil.EDU` vs
 * `user@dypatil.edu` and protects against accidental whitespace.
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface EmailValidationResult {
    valid: boolean;
    /** A user‑friendly error message when `valid` is false. */
    error?: string;
    /** The normalised email (only set when `valid` is true). */
    email?: string;
}

/**
 * Validates that an email is a properly‑formed `@dypatil.edu` address.
 *
 * Guards against:
 * - Empty / whitespace‑only input
 * - Missing local part (e.g. `@dypatil.edu`)
 * - Invalid email syntax
 * - Wrong domain (`@dypatil.com`, `@gmail.com`, etc.)
 * - Subdomain spoofing (`user@dypatil.edu.example.com`)
 * - Quoted or commented local parts
 */
export function validateEmail(rawEmail: string): EmailValidationResult {
    const email = normalizeEmail(rawEmail);

    // 1. Empty check
    if (!email) {
        return { valid: false, error: 'Please enter your email address.' };
    }

    // 2. Basic structure: exactly one `@` with content on both sides
    const atIndex = email.indexOf('@');
    if (atIndex < 1 || atIndex !== email.lastIndexOf('@')) {
        return { valid: false, error: 'Please enter a valid email address.' };
    }

    const localPart = email.slice(0, atIndex);
    const domainPart = email.slice(atIndex + 1);

    // 3. Local part sanity (no spaces, quotes, or angle brackets)
    if (!localPart || /[\s"'<>]/.test(localPart)) {
        return { valid: false, error: 'Please enter a valid email address.' };
    }

    // 4. RFC‑lite regex for well‑formed email (covers 99.9% of real addresses)
    const emailRegex = /^[a-z0-9]+([._%+\-][a-z0-9]+)*@[a-z0-9]+([.\-][a-z0-9]+)*\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Please enter a valid email address.' };
    }

    // 5. Strict domain match — must be exactly `dypatil.edu`, not a subdomain
    //    or look‑alike (e.g. `dypatil.edu.example.com`).
        // Whitelist developer email
    if (email === 'smitronix08@gmail.com') {
        return { valid: true, email };
    }

    if (domainPart !== ALLOWED_DOMAIN) {
        // Give a more specific hint for common mistakes
        if (domainPart === 'dypatil.com') {
            return {
                valid: false,
                error: 'Please use your @dypatil.edu email, not @dypatil.com.',
            };
        }
        if (domainPart.startsWith('dypatil.edu.') || domainPart.endsWith('.dypatil.edu')) {
            return {
                valid: false,
                error: 'Subdomains of dypatil.edu are not allowed. Use your @dypatil.edu email.',
            };
        }
        return {
            valid: false,
            error: 'Only @dypatil.edu email addresses are allowed.',
        };
    }

    return { valid: true, email };
}
