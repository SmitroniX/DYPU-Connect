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
