import { describe, it, expect } from 'vitest';
import { parseBrowser, parseOS, parseDevice } from './deviceSessions';

describe('deviceSessions', () => {
    describe('parseBrowser', () => {
        it('should parse Edge', () => {
            expect(parseBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59')).toBe('Microsoft Edge 91.0.864.59');
            expect(parseBrowser('Edg/')).toBe('Microsoft Edge');
        });

        it('should parse Opera', () => {
            expect(parseBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.277')).toBe('Opera 77.0.4054.277');
            expect(parseBrowser('Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14')).toBe('Opera 9.80');
        });

        it('should parse Brave', () => {
            expect(parseBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Brave/1.25')).toBe('Brave');
        });

        it('should parse Vivaldi', () => {
            expect(parseBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Vivaldi/4.0.2312.38')).toBe('Vivaldi 4.0.2312.38');
            expect(parseBrowser('Vivaldi/')).toBe('Vivaldi');
        });

        it('should parse Chrome', () => {
            expect(parseBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')).toBe('Chrome 91.0.4472.124');
            expect(parseBrowser('Chrome/')).toBe('Chrome');
        });

        it('should parse Firefox', () => {
            expect(parseBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0')).toBe('Firefox 89.0');
            expect(parseBrowser('Firefox/')).toBe('Firefox');
        });

        it('should parse Safari', () => {
            expect(parseBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15')).toBe('Safari 14.1.1');
            expect(parseBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1')).toBe('Safari 14.0');
        });

        it('should return Unknown Browser for unidentifiable UA', () => {
            expect(parseBrowser('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe('Unknown Browser');
            expect(parseBrowser('Something Random')).toBe('Unknown Browser');
        });
    });

    describe('parseOS', () => {
        it('should parse Windows versions', () => {
            expect(parseOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows 10/11');
            expect(parseOS('Mozilla/5.0 (Windows NT 6.3; WOW64)')).toBe('Windows 8.1');
            expect(parseOS('Mozilla/5.0 (Windows NT 6.1; Win64; x64)')).toBe('Windows 7');
            expect(parseOS('Mozilla/5.0 (Windows NT 5.1; rv:7.0.1) Gecko/20100101 Firefox/7.0.1')).toBe('Windows'); // Windows XP
        });

        it('should parse macOS', () => {
            expect(parseOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macOS 10.15.7');
            expect(parseOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6)')).toBe('macOS 10.14.6');
            expect(parseOS('Mac OS X')).toBe('macOS');
        });

        it('should parse Chrome OS', () => {
            expect(parseOS('Mozilla/5.0 (X11; CrOS x86_64 13904.77.0)')).toBe('Chrome OS');
        });

        it('should parse Android', () => {
            expect(parseOS('Mozilla/5.0 (Linux; Android 11; Pixel 4 XL)')).toBe('Android 11');
            expect(parseOS('Mozilla/5.0 (Linux; Android 10; SM-G975F)')).toBe('Android 10');
            expect(parseOS('Android')).toBe('Android');
        });

        it('should parse iOS', () => {
            expect(parseOS('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)')).toBe('iOS 14.6');
            expect(parseOS('Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X)')).toBe('iOS 13.3');
        });

        it('should parse Linux', () => {
            expect(parseOS('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0)')).toBe('Linux');
        });

        it('should return Unknown OS for unidentifiable UA', () => {
            expect(parseOS('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe('Unknown OS');
            expect(parseOS('Nintendo Switch')).toBe('Unknown OS');
        });
    });

    describe('parseDevice', () => {
        it('should parse iPhone', () => {
            expect(parseDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)')).toBe('iPhone');
        });

        it('should parse iPad', () => {
            expect(parseDevice('Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X)')).toBe('iPad');
        });

        it('should parse Android Phone', () => {
            expect(parseDevice('Mozilla/5.0 (Linux; Android 11; Pixel 4 XL Build/RQ3A.210705.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Mobile Safari/537.36')).toBe('Android Phone');
        });

        it('should parse Android Tablet', () => {
            expect(parseDevice('Mozilla/5.0 (Linux; Android 10; SM-T860) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36')).toBe('Android Tablet');
        });

        it('should parse Mac', () => {
            expect(parseDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac');
        });

        it('should parse Windows PC', () => {
            expect(parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows PC');
        });

        it('should parse Chromebook', () => {
            expect(parseDevice('Mozilla/5.0 (X11; CrOS x86_64 13904.77.0)')).toBe('Chromebook');
        });

        it('should parse Linux PC', () => {
            expect(parseDevice('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0)')).toBe('Linux PC');
        });

        it('should return Unknown Device for unidentifiable UA', () => {
            expect(parseDevice('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe('Unknown Device');
            expect(parseDevice('Nintendo Switch')).toBe('Unknown Device');
        });
    });
});
