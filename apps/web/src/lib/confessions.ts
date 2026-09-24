import type { Timestamp } from 'firebase/firestore';

export interface Confession {
    id: string;
    text: string;
    anonymousName: string;
    mood?: string;
    createdAt: Timestamp | { toDate: () => Date } | null;
    likesCount: number;
    commentsCount?: number;
}

export const MOODS = [
    { key: 'love',      label: '💘 Love',           gradient: 'from-pink-500/20 via-rose-500/10 to-transparent',     border: 'border-pink-500/30',   accent: 'text-pink-400',   bg: 'bg-pink-500/10' },
    { key: 'funny',     label: '😂 Funny',          gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',  border: 'border-yellow-500/30', accent: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { key: 'vent',      label: '🔥 Vent',           gradient: 'from-red-500/20 via-orange-500/10 to-transparent',    border: 'border-red-500/30',    accent: 'text-red-400',    bg: 'bg-red-500/10' },
    { key: 'secret',    label: '🤫 Secret',         gradient: 'from-purple-500/20 via-violet-500/10 to-transparent', border: 'border-purple-500/30', accent: 'text-purple-400', bg: 'bg-purple-500/10' },
    { key: 'academic',  label: '📚 Academic',       gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',      border: 'border-sky-500/30',    accent: 'text-sky-400',    bg: 'bg-sky-500/10' },
    { key: 'spill',     label: '☕ Spill',          gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',  border: 'border-amber-500/30',  accent: 'text-amber-400',  bg: 'bg-amber-500/10' },
    { key: 'rant',      label: '🗯️ Rant',           gradient: 'from-orange-500/20 via-red-500/10 to-transparent',   border: 'border-orange-500/30', accent: 'text-orange-400', bg: 'bg-orange-500/10' },
    { key: 'sad',       label: '😢 Sad',            gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',     border: 'border-blue-500/30',   accent: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { key: 'grateful',  label: '🙏 Grateful',       gradient: 'from-emerald-500/20 via-green-500/10 to-transparent', border: 'border-emerald-500/30',accent: 'text-emerald-400',bg: 'bg-emerald-500/10' },
] as const;

export type MoodKey = typeof MOODS[number]['key'];

export function getMood(key?: string) {
    if (!key) return MOODS[3]; // default: secret
    const match = MOODS.find(m => m.key === key);
    if (match) return match;
    if (key === 'rant') return MOODS.find(m => m.key === 'vent') || MOODS[3];
    return MOODS[3];
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
