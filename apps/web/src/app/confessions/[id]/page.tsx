'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ConfessionCard from '@/components/ConfessionCard';
import { Confession } from '@/lib/confessions';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateAnonymousName } from "@/lib/utils";
import { filterProfanity, sanitiseInput, hasDangerousContent } from '@/lib/security';
import { moderateTextAI } from '@/lib/moderation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

export default function SingleConfessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [confession, setConfession] = useState<Confession | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        
        const unsubConfession = onSnapshot(doc(db, 'confessions_public', id), (docSnap) => {
            if (docSnap.exists()) {
                setConfession({ id: docSnap.id, ...docSnap.data() } as Confession);
            } else {
                setConfession(null);
            }
            setLoading(false);
        }, () => {
            toast.error("Failed to load confession");
            setLoading(false);
        });

        const qComments = query(
            collection(db, 'confessions_public', id, 'comments'),
            orderBy('createdAt', 'desc')
        );
        const unsubComments = onSnapshot(qComments, (snap) => {
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubConfession();
            unsubComments();
        };
    }, [id]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || submitting || !confession) return;

        if (hasDangerousContent(newComment)) {
            toast.error('Blocked content detected.');
            return;
        }

        const safeText = sanitiseInput(newComment);
        setSubmitting(true);
        try {
            const modResult = await moderateTextAI(safeText);
            if (!modResult.isSafe) {
                toast.error(modResult.reason || 'Comment flagged for moderation.');
                setSubmitting(false);
                return;
            }

            await addDoc(collection(db, 'confessions_public', id, 'comments'), {
                text: safeText,
                userId: user.uid,
                createdAt: serverTimestamp(),
                anonymousName: generateAnonymousName()
            });

            await updateDoc(doc(db, 'confessions_public', id), {
                commentsCount: increment(1)
            });

            setNewComment('');
        } catch {
            toast.error("Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center">
                    <LoadingSpinner />
                </div>
            </DashboardLayout>
        );
    }

    if (!confession) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center py-20">
                    <h3 className="text-xl font-bold text-white mb-2">Confession not found</h3>
                    <p className="text-[var(--ui-text-muted)] mb-6">It may have been deleted or removed.</p>
                    <button onClick={() => router.push('/confessions')} className="px-6 py-2 bg-[var(--ui-accent)] rounded-full text-white font-bold hover:opacity-90">
                        Go Back
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col overflow-hidden">
                <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-[var(--ui-divider)] shrink-0">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] transition-colors active:scale-95">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" /> Thread
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                        <ConfessionCard confession={confession} linkToDetail={false} />

                        {/* Comments Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-[var(--ui-text-muted)] uppercase tracking-wider px-2">
                                Comments ({comments.length})
                            </h3>
                            
                            {/* Comment Input */}
                            <form onSubmit={handleCommentSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-[var(--ui-bg-elevated)] border border-[var(--ui-divider)] rounded-full px-4 py-2.5 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:ring-1 focus:ring-[var(--ui-accent)] outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || submitting}
                                    className="bg-[var(--ui-accent)] text-white p-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center shrink-0 w-10 h-10"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>

                            {/* Comment List */}
                            <div className="space-y-3 mt-4">
                                {comments.map(comment => (
                                    <div key={comment.id} className="bg-[var(--ui-bg-elevated)] p-4 rounded-2xl border border-[var(--ui-divider)] animate-[fade-in-up_0.2s_ease-out]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-full bg-[var(--ui-accent)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--ui-accent)] shadow-sm">
                                                {comment.anonymousName ? comment.anonymousName.charAt(0) : 'A'}
                                            </div>
                                            <span className="text-xs font-bold text-[var(--ui-text)]">
                                                {comment.anonymousName || 'Anonymous'}
                                            </span>
                                            <span className="text-[10px] text-[var(--ui-text-muted)] ml-auto">
                                                {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--ui-text)] leading-relaxed whitespace-pre-wrap break-words pl-8">
                                            {filterProfanity(comment.text)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="h-20" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
