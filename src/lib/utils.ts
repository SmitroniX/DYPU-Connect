const adjectives = ['Anonymous', 'Secret', 'Hidden', 'Mighty', 'Silent', 'Swift', 'Brave', 'Clever', 'Wild', 'Calm', 'Fierce'];
const animals = ['Tiger', 'Lion', 'Falcon', 'Wolf', 'Bear', 'Eagle', 'Hawk', 'Panther', 'Shark', 'Fox', 'Owl'];

export function generateAnonymousName(): string {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const anim = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(Math.random() * 900) + 100; // 100-999

    return `${adj} ${anim} ${num}`;
}
