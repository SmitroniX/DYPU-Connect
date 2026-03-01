'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import { generateAnonymousName } from '@/lib/utils';
import { sanitiseInput, hasDangerousContent } from '@/lib/security';
import { Send, Heart, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Confession {
    id: string;
    text: string;
    anonymousName: string;
    createdAt: Timestamp | null;
    likesCount: number;
}

export default function ConfessionsPage() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [newConfession, setNewConfession] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { userProfile } = useStore();

    useEffect(() => {
        const q = query(
            collection(db, 'confessions_public'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Confession[];
            setConfessions(data);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConfession.trim() || !userProfile || !user) return;

        // CrowdStrike Falcon-grade input sanitisation
        if (hasDangerousContent(newConfession)) {
            toast.error('Your message contains blocked content. Please remove any scripts or HTML tags.');
            return;
        }
        const safeText = sanitiseInput(newConfession);

        setLoading(true);
        try {
            const anonName = generateAnonymousName();

            // 1. Save Public Confession
            const docRef = await addDoc(collection(db, 'confessions_public'), {
                text: safeText,
                anonymousName: anonName,
                createdAt: serverTimestamp(),
                likesCount: 0
            });

            // 2. Save Private Tracking Document (Accessible only by admins)
            await setDoc(doc(db, 'confessions_private', docRef.id), {
                confessionId: docRef.id,
                userId: user.uid,
                email: user.email,
                realName: userProfile.name,
                anonymousName: anonName,
                createdAt: serverTimestamp(),
            });

            setNewConfession('');
            toast.success('Confession posted anonymously! 🤫');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to post confession');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const likeConfession = async (_id: string, _currentLikes: number) => {
        // TODO: Implement with FieldValue.increment + per-user like tracking
        //       to prevent duplicate likes (e.g. confession_likes subcollection).
        toast('Coming soon!', { icon: '❤️' });
    };

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name="confessions" description="Share your secrets anonymously — admins monitor abuse" />

                {/* Confession stream */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
                    {confessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--dc-bg-tertiary)] flex items-center justify-center mb-4">
                                <MessageSquare className="h-8 w-8 text-[var(--dc-text-muted)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--dc-text-primary)]">No confessions yet</h3>
                            <p className="text-sm text-[var(--dc-text-muted)] mt-1">Be the first to share a secret! 🤫</p>
                        </div>
                    ) : (
                        confessions.map((confession) => (
                            <div key={confession.id} className="dc-message group py-2">
                                <div className="flex gap-4">
                                    {/* Anonymous avatar */}
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--dc-accent-dim)] flex items-center justify-center text-[var(--dc-accent)] font-bold text-sm">
                                        {confession.anonymousName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="font-medium text-[var(--dc-accent)] text-[15px]">
                                                {confession.anonymousName}
                                            </span>
                                            <span className="text-xs text-[var(--dc-text-muted)]">
                                                {confession.createdAt?.toDate ? formatDistanceToNow(confession.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>

                                        {/* Embed card */}
                                        <div className="dc-embed max-w-lg">
                                            <p className="text-[15px] text-[var(--dc-text-primary)] leading-relaxed whitespace-pre-wrap break-words">
                                                {confession.text}
                                            </p>
                                        </div>

                                        {/* Reactions */}
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <button
                                                onClick={() => likeConfession(confession.id, confession.likesCount)}
                                                className="dc-pill hover:border-[var(--dc-accent)] cursor-pointer"
                                            >
                                                <Heart className="w-3.5 h-3.5" />
                                                <span>{confession.likesCount || 0}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Discord-style input */}
                <div className="px-4 pb-4 shrink-0">
                    <form className="bg-[var(--dc-bg-input)] rounded-lg" onSubmit={handleSubmit}>
                        <textarea
                            className="dc-input bg-transparent resize-none min-h-[44px] max-h-32"
                            rows={1}
                            placeholder="Share a confession anonymously..."
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            required
                        />
                        <div className="flex items-center justify-between px-3 pb-2">
                            <span className="text-[11px] text-[var(--dc-text-muted)] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--dc-accent)] animate-pulse" />
                                Anonymous identity
                            </span>
                            <button
                                type="submit"
                                disabled={loading || !newConfession.trim()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--dc-accent)] hover:bg-[var(--dc-accent-hover)] text-[var(--dc-bg-tertiary)] text-sm font-semibold rounded transition-colors disabled:opacity-30"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {loading ? 'Posting...' : 'Confess'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
