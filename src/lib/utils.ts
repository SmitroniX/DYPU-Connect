const adjectives = ['Anonymous', 'Secret', 'Hidden', 'Mighty', 'Silent', 'Swift', 'Brave', 'Clever', 'Wild', 'Calm', 'Fierce'];
const animals = ['Tiger', 'Lion', 'Falcon', 'Wolf', 'Bear', 'Eagle', 'Hawk', 'Panther', 'Shark', 'Fox', 'Owl'];

export function generateAnonymousName(): string {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const anim = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(Math.random() * 900) + 100; // 100-999

    return `${adj} ${anim} ${num}`;
}

/**
 * Discord-style message grouping.
 * Messages from the same sender within 5 minutes are grouped —
 * only the first message in a group shows avatar + name.
 */
export function shouldShowHeader(
    currentSenderId: string,
    previousSenderId: string | undefined,
    currentTimestamp: Date | null,
    previousTimestamp: Date | null,
    thresholdMs = 5 * 60 * 1000
): boolean {
    if (!previousSenderId) return true;
    if (currentSenderId !== previousSenderId) return true;
    if (!currentTimestamp || !previousTimestamp) return true;
    return currentTimestamp.getTime() - previousTimestamp.getTime() > thresholdMs;
}

