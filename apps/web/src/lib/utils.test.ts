import { describe, it, expect } from 'vitest';
import { generateAnonymousName, shouldShowHeader } from './utils';

describe('utils', () => {
    describe('generateAnonymousName', () => {
        it('should generate a string with an adjective, an animal, and a number', () => {
            const name = generateAnonymousName();
            expect(typeof name).toBe('string');
            expect(name.split(' ').length).toBe(3);
            const numPart = parseInt(name.split(' ')[2]);
            expect(numPart).toBeGreaterThanOrEqual(100);
            expect(numPart).toBeLessThanOrEqual(999);
        });
    });

    describe('shouldShowHeader', () => {
        const sender1 = 'user1';
        const sender2 = 'user2';
        const now = new Date();
        const justBefore = new Date(now.getTime() - 1000); // 1s ago
        const longAgo = new Date(now.getTime() - 6 * 60 * 1000); // 6m ago

        it('should return true if no previous sender', () => {
            expect(shouldShowHeader(sender1, undefined, now, null)).toBe(true);
        });

        it('should return true if different sender', () => {
            expect(shouldShowHeader(sender1, sender2, now, justBefore)).toBe(true);
        });

        it('should return false if same sender and recent', () => {
            expect(shouldShowHeader(sender1, sender1, now, justBefore)).toBe(false);
        });

        it('should return true if same sender and old', () => {
            expect(shouldShowHeader(sender1, sender1, now, longAgo)).toBe(true);
        });
    });
});
