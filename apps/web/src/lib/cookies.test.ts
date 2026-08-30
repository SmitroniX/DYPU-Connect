import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cookiesNext from 'cookies-next';
import {
    getConsent,
    saveConsent,
    acceptAllCookies,
    declineNonEssentialCookies,
    revokeConsent,
    isAnalyticsAllowed,
    isFunctionalAllowed,
    hasConsented,
    setSecureCookie,
    CONSENT_COOKIE_NAME,
    CONSENT_VERSION,
} from './cookies';

// Mock cookies-next
vi.mock('cookies-next', () => ({
    getCookie: vi.fn(),
    setCookie: vi.fn(),
    deleteCookie: vi.fn(),
}));

describe('Cookie Management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock Date.now() for predictable consentedAt values
        vi.useFakeTimers();
        vi.setSystemTime(new Date(1600000000000));

        // Mock window location by setting global
        Object.defineProperty(global, 'window', {
            value: {
                location: {
                    protocol: 'https:',
                    hostname: 'localhost',
                }
            },
            writable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getConsent()', () => {
        it('returns null if cookie is not present', () => {
            vi.mocked(cookiesNext.getCookie).mockReturnValue(undefined);
            expect(getConsent()).toBeNull();
        });

        it('returns parsed consent object if cookie is present and valid', () => {
            const validConsent = {
                essential: true,
                analytics: true,
                functional: false,
                consentedAt: 1600000000000,
                version: CONSENT_VERSION,
            };
            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify(validConsent));

            expect(getConsent()).toEqual(validConsent);
        });

        it('returns null if the version has changed', () => {
            const oldConsent = {
                essential: true,
                analytics: true,
                functional: true,
                consentedAt: 1500000000000,
                version: CONSENT_VERSION - 1, // Older version
            };
            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify(oldConsent));

            expect(getConsent()).toBeNull();
        });

        it('returns null on invalid JSON', () => {
            vi.mocked(cookiesNext.getCookie).mockReturnValue('invalid-json');
            expect(getConsent()).toBeNull();
        });
    });

    describe('saveConsent()', () => {
        it('saves consent correctly and sets cookie', () => {
            const prefs = { analytics: true, functional: false };
            const expectedConsent = {
                essential: true,
                analytics: true,
                functional: false,
                consentedAt: 1600000000000,
                version: CONSENT_VERSION,
            };

            const result = saveConsent(prefs);

            expect(result).toEqual(expectedConsent);
            expect(cookiesNext.setCookie).toHaveBeenCalledWith(
                CONSENT_COOKIE_NAME,
                JSON.stringify(expectedConsent),
                expect.objectContaining({
                    maxAge: 365 * 24 * 60 * 60,
                    path: '/',
                    sameSite: 'strict',
                })
            );
        });

        it('purges analytics cookies if analytics consent is declined', () => {
            saveConsent({ analytics: false, functional: true });

            const expectedAnalyticsPatterns = ['_ga', '_gid', '_gat', '__utma', '__utmb', '__utmc', '__utmz'];

            // Should call delete for each pattern twice (once for path '/', once for domain)
            expect(cookiesNext.deleteCookie).toHaveBeenCalledTimes(expectedAnalyticsPatterns.length * 2);

            expectedAnalyticsPatterns.forEach(pattern => {
                expect(cookiesNext.deleteCookie).toHaveBeenCalledWith(pattern, { path: '/' });
                expect(cookiesNext.deleteCookie).toHaveBeenCalledWith(pattern, { path: '/', domain: '.localhost' });
            });
        });
    });

    describe('acceptAllCookies()', () => {
        it('saves consent with all permissions set to true', () => {
            const result = acceptAllCookies();
            expect(result.analytics).toBe(true);
            expect(result.functional).toBe(true);
            expect(cookiesNext.setCookie).toHaveBeenCalled();
        });
    });

    describe('declineNonEssentialCookies()', () => {
        it('saves consent with all permissions set to false and purges analytics', () => {
            const result = declineNonEssentialCookies();
            expect(result.analytics).toBe(false);
            expect(result.functional).toBe(false);
            expect(cookiesNext.setCookie).toHaveBeenCalled();
            expect(cookiesNext.deleteCookie).toHaveBeenCalled();
        });
    });

    describe('revokeConsent()', () => {
        it('deletes consent cookie and purges other cookies', () => {
            revokeConsent();

            expect(cookiesNext.deleteCookie).toHaveBeenCalledWith(CONSENT_COOKIE_NAME, { path: '/' });
            // It should also purge functional cookies
            expect(cookiesNext.deleteCookie).toHaveBeenCalledWith('dypu_settings_v1', { path: '/' });
            // Check that at least some analytics cookies are being purged
            expect(cookiesNext.deleteCookie).toHaveBeenCalledWith('_ga', { path: '/' });
        });
    });

    describe('Category helpers', () => {
        it('isAnalyticsAllowed() returns correctly', () => {
            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify({
                essential: true, analytics: true, functional: false, consentedAt: 1600, version: CONSENT_VERSION
            }));
            expect(isAnalyticsAllowed()).toBe(true);

            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify({
                essential: true, analytics: false, functional: false, consentedAt: 1600, version: CONSENT_VERSION
            }));
            expect(isAnalyticsAllowed()).toBe(false);

            vi.mocked(cookiesNext.getCookie).mockReturnValue(undefined);
            expect(isAnalyticsAllowed()).toBe(false);
        });

        it('isFunctionalAllowed() returns correctly', () => {
            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify({
                essential: true, analytics: false, functional: true, consentedAt: 1600, version: CONSENT_VERSION
            }));
            expect(isFunctionalAllowed()).toBe(true);

            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify({
                essential: true, analytics: false, functional: false, consentedAt: 1600, version: CONSENT_VERSION
            }));
            expect(isFunctionalAllowed()).toBe(false);
        });

        it('hasConsented() returns correctly', () => {
            vi.mocked(cookiesNext.getCookie).mockReturnValue(JSON.stringify({
                essential: true, analytics: true, functional: true, consentedAt: 1600, version: CONSENT_VERSION
            }));
            expect(hasConsented()).toBe(true);

            vi.mocked(cookiesNext.getCookie).mockReturnValue(undefined);
            expect(hasConsented()).toBe(false);
        });
    });

    describe('setSecureCookie()', () => {
        it('sets cookie with secure defaults', () => {
            setSecureCookie('test_cookie', 'test_value');

            expect(cookiesNext.setCookie).toHaveBeenCalledWith(
                'test_cookie',
                'test_value',
                expect.objectContaining({
                    maxAge: 365 * 24 * 60 * 60,
                    path: '/',
                    sameSite: 'strict',
                })
            );
        });

        it('sets cookie with custom maxAge', () => {
            setSecureCookie('test_cookie', 'test_value', 3600);

            expect(cookiesNext.setCookie).toHaveBeenCalledWith(
                'test_cookie',
                'test_value',
                expect.objectContaining({
                    maxAge: 3600,
                })
            );
        });
    });
});
