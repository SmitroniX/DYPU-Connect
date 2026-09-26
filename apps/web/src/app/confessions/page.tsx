'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
import PageHeader from '@/components/PageHeader';
import { db } from '@/lib/firebase';
import {
    collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp,
    doc, setDoc
} from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import { generateAnonymousName } from '@/lib/utils';
import { sanitiseInput, hasDangerousContent } from '@/lib/security';
import { moderateTextAI } from '@/lib/moderation';
import {
    Send, Flame, Sparkles, Ghost,
    Clock, TrendingUp, X, Lock, Search, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

import { Confession, getMood, MOODS, MoodKey } from '@/lib/confessions';
import ConfessionCard from '@/components/ConfessionCard';
import { ConfessionCardSkeleton } from '@/components/Skeleton';

/* ── Sort Modes ── */
type SortMode = 'latest' | 'trending';

const MOOD_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'love', label: '💘 Love' },
    { key: 'funny', label: '😂 Funny' },
    { key: 'vent', label: '🔥 Vent' },
    { key: 'secret', label: '🤫 Secret' },
    { key: 'academic', label: '📚 Academic' },
] as const;

const feedContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.05,
        },
    },
};

const feedItemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 24,
        },
    },
};

/* ══════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════ */

export default function ConfessionsPage() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [newConfession, setNewConfession] = useState('');
    const [selectedMood, setSelectedMood] = useState<MoodKey | ''>('');
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [sortMode, setSortMode] = useState<SortMode>('latest');
    const [filterMood, setFilterMood] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showMoodPicker, setShowMoodPicker] = useState(false);
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
            setIsInitialLoading(false);
        }, (error) => {
            console.error('[Confessions] Listener error:', error);
            toast.error('Failed to load confessions. Check your permissions.');
        });
        return () => unsubscribe();
    }, []);

    /* ── Derived data (filter by mood, search query, and sort) ── */
    const sortedConfessions = (() => {
        let list = confessions;
        
        // Filter by mood
        if (filterMood !== 'all') {
            if (filterMood === 'vent') {
                list = list.filter(c => c.mood === 'vent' || c.mood === 'rant');
            } else {
                list = list.filter(c => c.mood === filterMood);
            }
        }

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c => 
                c.text.toLowerCase().includes(q) ||
                c.anonymousName.toLowerCase().includes(q)
            );
        }

        // Sort mode
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
                <div className="h-full flex flex-col relative">
                    <PageHeader
                        title="Confessions"
                        description="Spill the tea anonymously"
                        icon={<Flame className="h-4.5 w-4.5 text-amber-400" />}
                    />

                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">

                            {/* Confession Guidelines Notice */}
                            <div className="flex justify-center mb-4">
                                <div className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[11px] px-3.5 py-2 rounded-xl flex items-center gap-2 max-w-[360px] text-center shadow-sm ring-1 ring-[var(--ui-accent)]/20 animate-[fade-in-up_0.4s_ease-out]">
                                    <Lock className="w-3.5 h-3.5 shrink-0" />
                                    <span className="leading-tight">Confessions are pseudonymous on campus feeds. Always adhere to DYPU student community guidelines.</span>
                                </div>
                            </div>

                            {/* ═══════ Compose Card ═══════ */}
                            <div className="relative rounded-3xl border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/40 bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl shadow-lg transition-all duration-300 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--ui-accent)]/8 via-amber-500/5 to-transparent pointer-events-none" />
                                <form onSubmit={handleSubmit} className="relative p-5 sm:p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-9 w-9 rounded-2xl bg-[var(--ui-accent)]/15 border border-[var(--ui-accent)]/30 flex items-center justify-center shadow-sm">
                                            <Ghost className="h-4 w-4 text-[var(--ui-accent)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--ui-text)]">Post Anonymously</p>
                                            <p className="text-[11px] text-[var(--ui-text-muted)] font-medium">Your identity is cryptographically shielded from everyone</p>
                                        </div>
                                    </div>

                                    <textarea
                                        ref={textareaRef}
                                        className="w-full bg-transparent text-[15px] sm:text-[16px] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] resize-none outline-none min-h-[90px] leading-relaxed font-medium"
                                        placeholder="What's happening on campus? Spill your thoughts anonymously..."
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

                                    {/* Mood selector in composer */}
                                    <AnimatePresence>
                                        {showMoodPicker && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex flex-wrap gap-2 mt-2 mb-2 overflow-hidden"
                                            >
                                                {MOODS.map(m => (
                                                    <button
                                                        key={m.key}
                                                        type="button"
                                                        onClick={() => { setSelectedMood(m.key); setShowMoodPicker(false); }}
                                                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                                                            selectedMood === m.key
                                                                ? `${m.bg} ${m.accent} ring-1 ring-current border ${m.border}`
                                                                : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] border border-[var(--ui-border)]'
                                                        }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="h-px bg-[var(--ui-divider)] my-3.5" />

                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowMoodPicker(!showMoodPicker)}
                                                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-[var(--ui-text-secondary)] bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] hover:text-[var(--ui-text)] hover:border-[var(--ui-accent)]/40 transition-all shadow-sm"
                                            >
                                                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                                {selectedMood ? getMood(selectedMood).label : 'Add mood'}
                                            </button>
                                            {selectedMood && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMood('')}
                                                    className="p-1 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                                                    title="Remove mood"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <span className="text-[11px] text-[var(--ui-text-muted)] font-mono hidden sm:inline-block">
                                                {newConfession.length}/2000
                                            </span>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={loading || !newConfession.trim()}
                                            className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-40 transition-all shadow-md shadow-[var(--ui-accent)]/20 cursor-pointer"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                            {loading ? 'Posting...' : 'Confess'}
                                        </motion.button>
                                    </div>
                                </form>
                            </div>

                            {/* ═══════ Controls: Search Bar & Sort / Filters ═══════ */}
                            <div className="space-y-3">
                                {/* Search input with glass styling and clear button */}
                                <div className="relative w-full">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ui-text-muted)] pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search confessions by keyword or anonymous handle..."
                                        className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl bg-[var(--ui-bg-surface)]/80 backdrop-blur-md border border-[var(--ui-border)] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent)]/20 transition-all shadow-sm font-medium"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                                            title="Clear search"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Mood filters with smooth layout spring pill (layoutId="mood-filter-pill") & Sort toggle */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                    {/* Mood filter pill tabs */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                                        {MOOD_FILTERS.map((m) => {
                                            const isActive = filterMood === m.key;
                                            return (
                                                <button
                                                    key={m.key}
                                                    onClick={() => setFilterMood(m.key)}
                                                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                                                        isActive 
                                                            ? 'text-white' 
                                                            : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)]'
                                                    }`}
                                                >
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="mood-filter-pill"
                                                            className="absolute inset-0 rounded-full bg-[var(--ui-accent)] shadow-md shadow-[var(--ui-accent)]/25"
                                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10">{m.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Sort Mode Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto bg-[var(--ui-bg-elevated)]/60 backdrop-blur-sm p-1 rounded-full border border-[var(--ui-border)]">
                                        <button
                                            onClick={() => setSortMode('latest')}
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                                                sortMode === 'latest'
                                                    ? 'bg-[var(--ui-bg-surface)] text-[var(--ui-text)] shadow-sm'
                                                    : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                                            }`}
                                        >
                                            <Clock className="h-3.5 w-3.5" /> Latest
                                        </button>
                                        <button
                                            onClick={() => setSortMode('trending')}
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                                                sortMode === 'trending'
                                                    ? 'bg-[var(--ui-bg-surface)] text-[var(--ui-text)] shadow-sm'
                                                    : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                                            }`}
                                        >
                                            <TrendingUp className="h-3.5 w-3.5" /> Trending
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ═══════ Feed List with smooth entrance animation ═══════ */}
                            {isInitialLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <ConfessionCardSkeleton key={i} />
                                    ))}
                                </div>
                            ) : sortedConfessions.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-[var(--ui-bg-surface)]/60 border border-[var(--ui-border)]"
                                >
                                    <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
                                        <Flame className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-black text-[var(--ui-text)]">
                                        {searchQuery 
                                            ? `No confessions matching "${searchQuery}"`
                                            : filterMood !== 'all' 
                                                ? 'No confessions in this mood yet' 
                                                : 'No confessions yet'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-[var(--ui-text-muted)] mt-1.5 max-w-sm font-medium">
                                        {searchQuery 
                                            ? 'Try searching with another keyword or clearing your search.'
                                            : filterMood !== 'all' 
                                                ? 'Try selecting another mood tab or be the first to share one!' 
                                                : 'Be the first student to spill the tea! ☕'}
                                    </p>
                                    {(searchQuery || filterMood !== 'all') && (
                                        <button
                                            onClick={() => { setSearchQuery(''); setFilterMood('all'); }}
                                            className="mt-4 px-4 py-2 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    variants={feedContainerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4"
                                >
                                    {sortedConfessions.map((confession) => (
                                        <motion.div key={confession.id} variants={feedItemVariants}>
                                            <ConfessionCard confession={confession} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {/* Bottom spacer */}
                            <div className="h-16" />
                        </div>
                    </div>

                    {/* ═══════ Floating Action Button ("+ Share Confession") ═══════ */}
                    <motion.button
                        onClick={() => {
                            textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            textareaRef.current?.focus();
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 22 }}
                        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[var(--ui-accent)] via-amber-500 to-orange-500 text-white font-black text-sm shadow-xl shadow-orange-500/25 backdrop-blur-md border border-white/20 hover:shadow-2xl hover:shadow-orange-500/40 transition-shadow cursor-pointer"
                        title="Share a confession"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Share Confession</span>
                    </motion.button>
                </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
