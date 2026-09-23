import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    validateEmail,
    normalizeEmail,
    getRemainingCooldown,
    recordAuthLinkSent,
    checkAuthRateLimit,
    AUTH_COOLDOWN_STORAGE_KEY,
    AUTH_ATTEMPTS_STORAGE_KEY,
    MAX_AUTH_REQUESTS_PER_WINDOW,
    RESEND_COOLDOWN_SECONDS,
} from './authValidation';

describe('authValidation', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('normalizeEmail', () => {
        it('lowercases and trims whitespace', () => {
            expect(normalizeEmail('  Test.User@DYPATIL.edu  ')).toBe('test.user@dypatil.edu');
        });
    });

    describe('validateEmail', () => {
        it('accepts valid @dypatil.edu emails', () => {
            const result = validateEmail('student.cs@dypatil.edu');
            expect(result.valid).toBe(true);
            expect(result.email).toBe('student.cs@dypatil.edu');
        });

        it('rejects non-dypatil.edu domains', () => {
            const result = validateEmail('user@gmail.com');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Only @dypatil.edu');
        });

        it('rejects dypatil.com with specific error', () => {
            const result = validateEmail('user@dypatil.com');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not @dypatil.com');
        });

        it('rejects subdomain spoofing', () => {
            const result = validateEmail('user@dypatil.edu.evil.com');
            expect(result.valid).toBe(false);
        });

        it('allows whitelist admin email', () => {
            const result = validateEmail('smitronix08@gmail.com');
            expect(result.valid).toBe(true);
            expect(result.email).toBe('smitronix08@gmail.com');
        });
    });

    describe('getRemainingCooldown and recordAuthLinkSent', () => {
        it('returns 0 if no link was recorded', () => {
            expect(getRemainingCooldown()).toBe(0);
        });

        it('returns correct remaining seconds after recording a send', () => {
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);
            recordAuthLinkSent();

            expect(getRemainingCooldown()).toBe(RESEND_COOLDOWN_SECONDS);

            // Advance time by 20 seconds
            vi.spyOn(Date, 'now').mockReturnValue(now + 20000);
            expect(getRemainingCooldown()).toBe(RESEND_COOLDOWN_SECONDS - 20);

            // Advance time past cooldown
            vi.spyOn(Date, 'now').mockReturnValue(now + (RESEND_COOLDOWN_SECONDS + 5) * 1000);
            expect(getRemainingCooldown()).toBe(0);
        });
    });

    describe('checkAuthRateLimit', () => {
        it('allows requests within the limit', () => {
            expect(checkAuthRateLimit().allowed).toBe(true);
        });

        it('blocks requests once maximum burst limit is exceeded', () => {
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);

            for (let i = 0; i < MAX_AUTH_REQUESTS_PER_WINDOW; i++) {
                recordAuthLinkSent();
            }

            const limitCheck = checkAuthRateLimit();
            expect(limitCheck.allowed).toBe(false);
            expect(limitCheck.waitSeconds).toBeGreaterThan(0);
        });
    });
});
