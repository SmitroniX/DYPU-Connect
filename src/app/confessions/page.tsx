'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { db } from '@/lib/firebase';
import {
    collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp,
    doc, setDoc, updateDoc, increment, getDoc, deleteDoc,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import { generateAnonymousName } from '@/lib/utils';
import { sanitiseInput, hasDangerousContent, filterProfanity } from '@/lib/security';
import {
    Send, Heart, MessageCircle, Flame, Sparkles, Ghost,
    Clock, TrendingUp, Filter, ChevronDown, X, Share2,
    Bookmark, Quote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

/* ── Types ── */

interface Confession {
    id: string;
    text: string;
    anonymousName: string;
    mood?: string;
    createdAt: Timestamp | null;
    likesCount: number;
    commentsCount?: number;
}

/* ── Mood Config ── */

const MOODS = [
    { key: 'spill',     label: '☕ Spill the Tea',  gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',  border: 'border-amber-500/20',  accent: 'text-amber-400',  bg: 'bg-amber-500/10' },
    { key: 'love',      label: '💘 Love',           gradient: 'from-pink-500/20 via-rose-500/10 to-transparent',     border: 'border-pink-500/20',   accent: 'text-pink-400',   bg: 'bg-pink-500/10' },
    { key: 'rant',      label: '🔥 Rant',           gradient: 'from-red-500/20 via-orange-500/10 to-transparent',    border: 'border-red-500/20',    accent: 'text-red-400',    bg: 'bg-red-500/10' },
    { key: 'funny',     label: '😂 Funny',          gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',  border: 'border-yellow-500/20', accent: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { key: 'sad',       label: '😢 Sad',            gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',     border: 'border-blue-500/20',   accent: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { key: 'secret',    label: '🤫 Secret',         gradient: 'from-purple-500/20 via-violet-500/10 to-transparent', border: 'border-purple-500/20', accent: 'text-purple-400', bg: 'bg-purple-500/10' },
    { key: 'grateful',  label: '🙏 Grateful',       gradient: 'from-emerald-500/20 via-green-500/10 to-transparent', border: 'border-emerald-500/20',accent: 'text-emerald-400',bg: 'bg-emerald-500/10' },
] as const;

type MoodKey = typeof MOODS[number]['key'];

function getMood(key?: string) {
    return MOODS.find(m => m.key === key) ?? MOODS[5]; // default: secret
}

/* ── Random gradient for cards without mood ── */
const CARD_GRADIENTS = [
    'from-[var(--ui-accent)]/15 via-transparent to-transparent',
    'from-purple-500/15 via-transparent to-transparent',
    'from-blue-500/15 via-transparent to-transparent',
    'from-pink-500/15 via-transparent to-transparent',
    'from-amber-500/15 via-transparent to-transparent',
];
function cardGradient(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

/* ── Sort Modes ── */
type SortMode = 'latest' | 'trending';

/* ══════════════════════════════════════════════════════
   Confession Card
   ══════════════════════════════════════════════════════ */

function ConfessionCard({
    confession,
    onLike,
}: {
    confession: Confession;
    onLike: (id: string) => void;
}) {
    const mood = getMood(confession.mood);
    const gradient = confession.mood ? mood.gradient : cardGradient(confession.id);
    const borderColor = confession.mood ? mood.border : 'border-[var(--ui-border)]';

    const timeAgo = confession.createdAt?.toDate
        ? formatDistanceToNow(confession.createdAt.toDate(), { addSuffix: true })
        : 'Just now';

    const handleShare = async () => {
        const filtered = filterProfanity(confession.text);
        const text = `"${filtered.slice(0, 200)}${filtered.length > 200 ? '…' : ''}" — Anonymous on DYPU Connect`;
        if (navigator.share) {
            try { await navigator.share({ text }); } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard!');
        }
    };

    return (
        <article
            className={`group relative rounded-2xl border ${borderColor} bg-[var(--ui-bg-surface)] overflow-hidden transition-all duration-200 hover:border-[var(--ui-accent)]/30 hover:shadow-lg hover:shadow-[var(--ui-accent)]/5`}
        >
            {/* Gradient wash */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />

            {/* Content */}
            <div className="relative p-5 sm:p-6">
                {/* Top row: mood tag + time */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {confession.mood ? (
                            <span className={`inline-flex items-center gap-1 rounded-full ${mood.bg} px-2.5 py-1 text-[11px] font-semibold ${mood.accent}`}>
                                {mood.label}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--ui-accent)]">
                                <Ghost className="h-3 w-3" /> Anonymous
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                    </span>
                </div>

                {/* Quote decoration */}
                <Quote className="h-6 w-6 text-[var(--ui-accent)]/20 mb-2" />

                {/* Confession text */}
                <p className="text-[15px] sm:text-base leading-relaxed text-[var(--ui-text)] whitespace-pre-wrap break-words min-h-[3rem]">
                    {filterProfanity(confession.text)}
                </p>

                {/* Anonymous identity */}
                <div className="mt-4 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[var(--ui-accent)]/15 flex items-center justify-center text-[var(--ui-accent)] text-xs font-bold">
                        {confession.anonymousName.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-[var(--ui-text-secondary)]">
                        {confession.anonymousName}
                    </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-[var(--ui-divider)] my-4" />

                {/* Action bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onLike(confession.id)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ui-text-muted)] hover:text-pink-400 hover:bg-pink-500/10 transition-all"
                        >
                            <Heart className="h-4 w-4" />
                            <span>{confession.likesCount || 0}</span>
                        </button>
                        <button
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ui-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span>{confession.commentsCount || 0}</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleShare}
                            className="p-1.5 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-all"
                            aria-label="Share confession"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>
                        <button
                            className="p-1.5 rounded-full text-[var(--ui-text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            aria-label="Bookmark"
                        >
                            <Bookmark className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function ConfessionsPage() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [newConfession, setNewConfession] = useState('');
    const [selectedMood, setSelectedMood] = useState<MoodKey | ''>('');
    const [loading, setLoading] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>('latest');
    const [filterMood, setFilterMood] = useState<string>('all');
    const [showMoodPicker, setShowMoodPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { user } = useAuth();
    const { userProfile } = useStore();

    /* ── Real-time listener ── */
    useEffect(() => {
        const q = query(
            collection(db, 'confessions_public'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Confession[];
            setConfessions(data);
        }, (error) => {
            console.error('Confessions listener error:', error);
        });
        return () => unsubscribe();
    }, []);

    /* ── Derived data ── */
    const sortedConfessions = (() => {
        let list = confessions;
        if (filterMood !== 'all') {
            list = list.filter(c => c.mood === filterMood);
        }
        if (sortMode === 'trending') {
            return [...list].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
        }
        return list;
    })();

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConfession.trim() || !userProfile || !user) return;

        if (hasDangerousContent(newConfession)) {
            toast.error('Your message contains blocked content. Please remove any scripts or HTML tags.');
            return;
        }
        const safeText = sanitiseInput(newConfession);

        setLoading(true);
        try {
            const anonName = generateAnonymousName();

            const docRef = await addDoc(collection(db, 'confessions_public'), {
                text: safeText,
                anonymousName: anonName,
                mood: selectedMood || null,
                createdAt: serverTimestamp(),
                likesCount: 0,
                commentsCount: 0,
            });

            await setDoc(doc(db, 'confessions_private', docRef.id), {
                confessionId: docRef.id,
                userId: user.uid,
                email: user.email,
                realName: userProfile.name,
                anonymousName: anonName,
                createdAt: serverTimestamp(),
            });

            setNewConfession('');
            setSelectedMood('');
            toast.success('Confession posted anonymously! 🤫');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to post confession');
        } finally {
            setLoading(false);
        }
    };

    /* ── Like ── */
    const handleLike = useCallback(async (id: string) => {
        if (!user) return;
        const likeRef = doc(db, 'confessions_public', id, 'likes', user.uid);
        const likeSnap = await getDoc(likeRef);

        if (likeSnap.exists()) {
            await deleteDoc(likeRef);
            await updateDoc(doc(db, 'confessions_public', id), { likesCount: increment(-1) });
        } else {
            await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
            await updateDoc(doc(db, 'confessions_public', id), { likesCount: increment(1) });
        }
    }, [user]);

    /* ── Auto-resize textarea ── */
    const autoResize = () => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 200) + 'px';
        }
    };

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <PageHeader
                    title="Confessions"
                    description="Spill the tea anonymously"
                    icon={<Flame className="h-4.5 w-4.5 text-amber-400" />}
                />

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                        {/* ═══════ Compose Card ═══════ */}
                        <div className="relative rounded-2xl border border-[var(--ui-accent)]/20 bg-[var(--ui-bg-surface)] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--ui-accent)]/8 via-transparent to-transparent pointer-events-none" />
                            <form onSubmit={handleSubmit} className="relative p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-[var(--ui-accent)]/15 flex items-center justify-center">
                                        <Ghost className="h-4 w-4 text-[var(--ui-accent)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--ui-text)]">Post anonymously</p>
                                        <p className="text-[10px] text-[var(--ui-text-muted)]">Your identity is hidden from everyone</p>
                                    </div>
                                </div>

                                <textarea
                                    ref={textareaRef}
                                    className="w-full bg-transparent text-[15px] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] resize-none outline-none min-h-[80px] leading-relaxed"
                                    placeholder="What's on your mind? Share your confession..."
                                    value={newConfession}
                                    onChange={(e) => { setNewConfession(e.target.value); autoResize(); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                    maxLength={2000}
                                    required
                                />

                                {/* Mood selector */}
                                {showMoodPicker && (
                                    <div className="flex flex-wrap gap-2 mt-2 mb-1 animate-[fade-in-up_0.15s_ease-out]">
                                        {MOODS.map(m => (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={() => { setSelectedMood(m.key); setShowMoodPicker(false); }}
                                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                                    selectedMood === m.key
                                                        ? `${m.bg} ${m.accent} ring-1 ring-current`
                                                        : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'
                                                }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="h-px bg-[var(--ui-divider)] my-3" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowMoodPicker(!showMoodPicker)}
                                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-all"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            {selectedMood ? getMood(selectedMood).label : 'Add mood'}
                                        </button>
                                        {selectedMood && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedMood('')}
                                                className="p-1 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                        <span className="text-[10px] text-[var(--ui-text-muted)]">
                                            {newConfession.length}/2000
                                        </span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !newConfession.trim()}
                                        className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-30 transition-all shadow-lg shadow-[var(--ui-accent)]/20"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {loading ? 'Posting...' : 'Confess'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ═══════ Filter & Sort Bar ═══════ */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSortMode('latest')}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                        sortMode === 'latest'
                                            ? 'bg-[var(--ui-accent)] text-white shadow-md shadow-[var(--ui-accent)]/20'
                                            : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'
                                    }`}
                                >
                                    <Clock className="h-3.5 w-3.5" /> Latest
                                </button>
                                <button
                                    onClick={() => setSortMode('trending')}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                        sortMode === 'trending'
                                            ? 'bg-[var(--ui-accent)] text-white shadow-md shadow-[var(--ui-accent)]/20'
                                            : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'
                                    }`}
                                >
                                    <TrendingUp className="h-3.5 w-3.5" /> Trending
                                </button>
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                    filterMood !== 'all'
                                        ? 'bg-[var(--ui-accent)]/15 text-[var(--ui-accent)]'
                                        : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)]'
                                }`}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Filter
                                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Mood filter pills */}
                        {showFilters && (
                            <div className="flex flex-wrap gap-2 animate-[fade-in-up_0.15s_ease-out]">
                                <button
                                    onClick={() => setFilterMood('all')}
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                        filterMood === 'all'
                                            ? 'bg-[var(--ui-accent)] text-white'
                                            : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'
                                    }`}
                                >
                                    All
                                </button>
                                {MOODS.map(m => (
                                    <button
                                        key={m.key}
                                        onClick={() => setFilterMood(m.key)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                            filterMood === m.key
                                                ? `${m.bg} ${m.accent} ring-1 ring-current`
                                                : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ═══════ Feed ═══════ */}
                        {sortedConfessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="h-20 w-20 rounded-3xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                    <Flame className="h-10 w-10 text-[var(--ui-text-muted)]" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--ui-text)]">
                                    {filterMood !== 'all' ? 'No confessions with this mood' : 'No confessions yet'}
                                </h3>
                                <p className="text-sm text-[var(--ui-text-muted)] mt-2 max-w-xs">
                                    {filterMood !== 'all' ? 'Try a different mood filter or be the first to post one!' : 'Be the first to spill the tea! ☕'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedConfessions.map((confession) => (
                                    <ConfessionCard
                                        key={confession.id}
                                        confession={confession}
                                        onLike={handleLike}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Bottom spacer */}
                        <div className="h-4" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
