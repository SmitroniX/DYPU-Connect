'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
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
            <div className="max-w-3xl mx-auto py-4 h-full flex flex-col animate-[fade-in-up_0.5s_ease-out]">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                        💗 Campus Confessions
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Share your secrets, thoughts or crushes completely anonymously.
                        Be respectful — admins strictly monitor abuse.
                    </p>
                </div>

                {/* Input Form */}
                <div className="glass-strong p-5 mb-8">
                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="w-full h-24 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300/30 resize-none transition-all"
                            placeholder="I have a crush on someone from Computer Division B..."
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                            required
                        />
                        <div className="mt-3 flex justify-between items-center">
                            <span className="text-xs text-slate-500 flex items-center">
                                <span className="w-2 h-2 rounded-full bg-sky-400 mr-2 animate-pulse"></span>
                                Posting anonymously as e.g &ldquo;Silent Tiger 420&rdquo;
                            </span>
                            <button
                                type="submit"
                                disabled={loading || !newConfession.trim()}
                                className="inline-flex items-center px-5 py-2.5 bg-linear-to-r from-sky-300 to-slate-300 hover:from-sky-200 hover:to-slate-200 text-slate-900 text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-sky-300/20 disabled:opacity-50"
                            >
                                {loading ? 'Posting...' : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" /> Share Secret
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Confessions List */}
                <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-1">
                    {confessions.map((confession) => (
                        <div key={confession.id} className="glass hover:border-sky-300/30 hover:bg-white/[0.07] transition-all duration-300 p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-9 h-9 rounded-full bg-linear-to-tr from-sky-300 to-slate-400 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-sky-300/20">
                                        {confession.anonymousName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{confession.anonymousName}</h3>
                                        <p className="text-xs text-slate-500">
                                            {confession.createdAt?.toDate ? formatDistanceToNow(confession.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-slate-200 text-base leading-relaxed whitespace-pre-wrap">
                                {confession.text}
                            </p>
                            <div className="mt-4 flex items-center">
                                <button
                                    onClick={() => likeConfession(confession.id, confession.likesCount)}
                                    className="inline-flex items-center text-xs text-slate-500 hover:text-sky-300 transition-colors group"
                                >
                                    <Heart className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
                                    {confession.likesCount || 0}
                                </button>
                            </div>
                        </div>
                    ))}

                    {confessions.length === 0 && (
                        <div className="glass border-dashed text-center py-16">
                            <span className="text-4xl mb-4 block">🤫</span>
                            <MessageSquare className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                            <h3 className="text-sm font-semibold text-white">No confessions yet</h3>
                            <p className="mt-1 text-sm text-slate-500">Be the first to share a secret!</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
