'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
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
import { moderateTextAI } from '@/lib/moderation';
import {
    Send, Heart, MessageCircle, Flame, Sparkles, Ghost,
    Clock, TrendingUp, Filter, ChevronDown, X, Share2,
    Bookmark, Quote, Lock, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

import { Confession, getMood, MOODS, MoodKey } from '@/lib/confessions';
import ConfessionCard from '@/components/ConfessionCard';

/* ── Sort Modes ── */
type SortMode = 'latest' | 'trending';

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
            console.error('[Confessions] Listener error:', error);
            toast.error('Failed to load confessions. Check your permissions.');
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
            // AI Moderation Check
            const modResult = await moderateTextAI(safeText);
            if (!modResult.isSafe) {
                toast.error(modResult.reason || 'Your confession was flagged for moderation.');
                setLoading(false);
                return;
            }

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
            <ModuleGuard moduleKey="disableConfessions" moduleName="Confessions">
                <div className="h-full flex flex-col">
                    <PageHeader
                    title="Confessions"
                    description="Spill the tea anonymously"
                    icon={<Flame className="h-4.5 w-4.5 text-amber-400" />}
                />

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                        {/* E2EE Notice */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 max-w-[340px] text-center shadow-sm ring-1 ring-[var(--ui-accent)]/20 animate-[fade-in-up_0.4s_ease-out]">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span className="leading-tight">Confessions are end-to-end encrypted. No one, not even DYPU Connect, can trace them back to you.</span>
                            </div>
                        </div>

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
                                    />
                                ))}
                            </div>
                        )}

                        {/* Bottom spacer */}
                        <div className="h-4" />
                    </div>
                </div>
            </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
