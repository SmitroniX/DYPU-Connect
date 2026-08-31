export interface Confession {
    id: string;
    text: string;
    anonymousName: string;
    mood?: string;
    createdAt: any;
    likesCount: number;
    commentsCount?: number;
}

export const MOODS = [
    { key: 'spill',     label: '☕ Spill the Tea',  gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',  border: 'border-amber-500/20',  accent: 'text-amber-400',  bg: 'bg-amber-500/10' },
    { key: 'love',      label: '💘 Love',           gradient: 'from-pink-500/20 via-rose-500/10 to-transparent',     border: 'border-pink-500/20',   accent: 'text-pink-400',   bg: 'bg-pink-500/10' },
    { key: 'rant',      label: '🔥 Rant',           gradient: 'from-red-500/20 via-orange-500/10 to-transparent',    border: 'border-red-500/20',    accent: 'text-red-400',    bg: 'bg-red-500/10' },
    { key: 'funny',     label: '😂 Funny',          gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',  border: 'border-yellow-500/20', accent: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { key: 'sad',       label: '😢 Sad',            gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',     border: 'border-blue-500/20',   accent: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { key: 'secret',    label: '🤫 Secret',         gradient: 'from-purple-500/20 via-violet-500/10 to-transparent', border: 'border-purple-500/20', accent: 'text-purple-400', bg: 'bg-purple-500/10' },
    { key: 'grateful',  label: '🙏 Grateful',       gradient: 'from-emerald-500/20 via-green-500/10 to-transparent', border: 'border-emerald-500/20',accent: 'text-emerald-400',bg: 'bg-emerald-500/10' },
] as const;

export type MoodKey = typeof MOODS[number]['key'];

export function getMood(key?: string) {
    return MOODS.find(m => m.key === key) ?? MOODS[5]; // default: secret
}

const CARD_GRADIENTS = [
    'from-[var(--ui-accent)]/15 via-transparent to-transparent',
    'from-purple-500/15 via-transparent to-transparent',
    'from-blue-500/15 via-transparent to-transparent',
    'from-pink-500/15 via-transparent to-transparent',
    'from-amber-500/15 via-transparent to-transparent',
];

export function cardGradient(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}
