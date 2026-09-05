'use client';

import { useState, useRef, useEffect } from 'react';
import { Confession, getMood, cardGradient } from '@/lib/confessions';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import {
    Heart, MessageCircle, Ghost, Clock, Quote,
    Share2, Camera, MoreVertical, Flag, Download, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { filterProfanity } from '@/lib/security';
import { shareToAndroid, isAndroidApp, shareImageToAndroid, saveImageToAndroid } from '@/lib/android';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ConfessionCardProps {
    confession: Confession;
    linkToDetail?: boolean;
}

export default function ConfessionCard({ confession, linkToDetail = true }: ConfessionCardProps) {
    const cardRef = useRef<HTMLElement>(null);
    const { user } = useAuth();
    
    // State
    const [likesCount, setLikesCount] = useState(confession.likesCount || 0);
    const [commentsCount, setCommentsCount] = useState(confession.commentsCount || 0);

    useEffect(() => {
        setLikesCount(confession.likesCount || 0);
    }, [confession.likesCount]);

    useEffect(() => {
        setCommentsCount(confession.commentsCount || 0);
    }, [confession.commentsCount]);
    const [isLiked, setIsLiked] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
    
    // UI state
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    
    const mood = getMood(confession.mood);
    const gradient = confession.mood ? mood.gradient : cardGradient(confession.id);
    const borderColor = confession.mood ? mood.border : 'border-[var(--ui-border)]';
    
    const timeAgo = confession.createdAt?.toDate
        ? formatDistanceToNow(confession.createdAt.toDate(), { addSuffix: true })
        : 'Just now';

    // Check if liked initially
    useEffect(() => {
        if (!user) return;
        const checkLike = async () => {
            try {
                const likeRef = doc(db, 'confessions_public', confession.id, 'likes', user.uid);
                const likeSnap = await getDoc(likeRef);
                setIsLiked(likeSnap.exists());
            } catch {
                // Ignore error
            }
        };
        checkLike();
    }, [user, confession.id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error('You must be logged in to like.');
            return;
        }
        if (likeLoading) return;
        
        setLikeLoading(true);
        const likeRef = doc(db, 'confessions_public', confession.id, 'likes', user.uid);
        
        // Optimistic update
        const previousIsLiked = isLiked;
        const previousCount = likesCount;
        
        setIsLiked(!previousIsLiked);
        setLikesCount(prev => prev + (previousIsLiked ? -1 : 1));
        
        try {
            if (previousIsLiked) {
                await deleteDoc(likeRef);
                await updateDoc(doc(db, 'confessions_public', confession.id), { likesCount: increment(-1) });
            } else {
                await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
                await updateDoc(doc(db, 'confessions_public', confession.id), { likesCount: increment(1) });
            }
        } catch {
            // Revert on error
            setIsLiked(previousIsLiked);
            setLikesCount(previousCount);
            toast.error('Failed to update like status');
        } finally {
            setLikeLoading(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const url = `${window.location.origin}/confessions/${confession.id}`;
        const filtered = filterProfanity(confession.text);
        const text = `"${filtered.slice(0, 100)}${filtered.length > 100 ? '…' : ''}" — Read this confession on DYPU Connect!`;
        
        if (isAndroidApp()) {
            shareToAndroid(`${text}

${url}`, 'DYPU Connect Confession');
            return;
        }

        if (navigator.share) {
            try { 
                await navigator.share({ title: 'DYPU Connect Confession', text, url });
                return;
            } catch (error) { 
                console.log(error);
            }
        }
        
        try {
            await navigator.clipboard.writeText(`${text}

${url}`);
            toast.success('Link and text copied to clipboard!');
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleScreenshot = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!cardRef.current) return;
        try {
            toast.loading('Creating snapshot...', { id: 'screenshot' });
            
            const { toPng } = await import('html-to-image');
            
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2,
                cacheBust: true,
                filter: (node) => {
                    if (node instanceof HTMLElement) {
                        if (
                            node.hasAttribute('data-html2canvas-ignore') || 
                            node.classList.contains('more-menu-container')
                        ) {
                            return false;
                        }
                    }
                    return true;
                },
            });
            
            setSnapshotUrl(dataUrl);
            toast.success('Snapshot ready!', { id: 'screenshot' });
        } catch (err) {
            console.error('Snapshot error:', err);
            toast.error('Failed to create snapshot.', { id: 'screenshot' });
        }
    };

    const handleSaveSnapshot = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!snapshotUrl) return;

        const filename = `Confession_${confession.id}.png`;
        if (isAndroidApp() && saveImageToAndroid(snapshotUrl, filename)) {
            toast.success('Saved to Pictures/DYPU-Connect!');
            return;
        }

        const link = document.createElement('a');
        link.download = filename;
        link.href = snapshotUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!');
    };

    const handleShareSnapshot = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!snapshotUrl) return;

        if (isAndroidApp() && shareImageToAndroid(snapshotUrl, 'Confession from DYPU Connect')) {
            return;
        }

        try {
            const res = await fetch(snapshotUrl);
            const blob = await res.blob();
            const file = new File([blob], `Confession_${confession.id}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'DYPU Connect Confession',
                    text: 'Shared from DYPU Connect',
                });
                return;
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                console.error('Share error:', err);
            }
            return;
        }

        // Fallback to save if share not available
        handleSaveSnapshot(e);
    };

    const handleReport = async (reason: string) => {
        if (!user) {
            toast.error("You must be logged in to report.");
            return;
        }
        
        try {
            await addDoc(collection(db, 'reports'), {
                targetId: confession.id,
                targetType: 'confession',
                reason,
                reportedBy: user.uid,
                createdAt: serverTimestamp(),
                status: 'pending'
            });
            toast.success("Confession reported for review.");
            setShowReportModal(false);
            setShowMoreMenu(false);
        } catch {
            toast.error("Failed to submit report.");
        }
    };

    const CardContent = (
        <article
            ref={cardRef}
            className={`group relative rounded-3xl border ${borderColor} bg-[var(--ui-bg-surface)] overflow-hidden transition-all duration-300 hover:border-[var(--ui-accent)]/40 hover:shadow-xl hover:shadow-[var(--ui-accent)]/10 hover:-translate-y-0.5`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`} />

            <div className="relative p-6 sm:p-7 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        {confession.mood ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full ${mood.bg} px-3 py-1 text-[12px] font-bold tracking-wide ${mood.accent}`}>
                                {mood.label}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-accent)]/10 px-3 py-1 text-[12px] font-bold tracking-wide text-[var(--ui-accent)]">
                                <Ghost className="h-3.5 w-3.5" /> Anonymous
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-[var(--ui-text-muted)] flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {timeAgo}
                        </span>
                        
                        <div className="relative more-menu-container">
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
                                className="p-1 -mr-1 rounded-full text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] transition-colors active:scale-95"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {showMoreMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowMoreMenu(false); }} />
                                    <div className="absolute right-0 mt-1 w-36 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-divider)] shadow-xl overflow-hidden z-50 animate-[fade-in-up_0.15s_ease-out]">
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReportModal(true); setShowMoreMenu(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--ui-danger)] hover:bg-[var(--ui-danger)]/10 transition-colors text-left font-medium"
                                        >
                                            <Flag className="h-4 w-4" /> Report
                                        </button>
                                        {/* If we had client-side deletion access we would add it here */}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <Quote className="h-8 w-8 text-[var(--ui-accent)]/20 mb-3" />

                <p className="text-[16px] sm:text-[17px] leading-relaxed text-[var(--ui-text)] whitespace-pre-wrap break-words font-medium flex-1">
                    {filterProfanity(confession.text)}
                </p>

                <div className="mt-6 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--ui-accent)]/15 flex items-center justify-center text-[var(--ui-accent)] text-xs font-bold shadow-sm">
                        {confession.anonymousName.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--ui-text)]">
                            {confession.anonymousName}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--ui-text-muted)]">
                            DYPU Connect
                        </span>
                    </div>
                </div>

                <div className="h-px bg-[var(--ui-divider)] my-5" data-html2canvas-ignore />

                {/* Actions */}
                <div className="flex items-center justify-between" data-html2canvas-ignore>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={handleLike}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                                isLiked 
                                ? 'text-pink-500 bg-pink-500/15' 
                                : 'text-[var(--ui-text-muted)] hover:text-pink-400 hover:bg-pink-500/10'
                            }`}
                        >
                            <motion.div
                                animate={isLiked ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4, type: "spring" }}
                            >
                                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                            </motion.div>
                            <span>{likesCount}</span>
                        </button>
                        
                        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[var(--ui-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-all active:scale-95 cursor-pointer">
                            <MessageCircle className="h-4 w-4" />
                            <span>{commentsCount}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                            onClick={handleScreenshot}
                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all active:scale-95 flex items-center gap-1.5"
                            title="Snapshot"
                        >
                            <Camera className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:block">Snap</span>
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-all active:scale-95"
                            title="Share"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            </article>
    );

    
    
    const reportModal = (
        <>
            {/* Snapshot Modal */}
            {snapshotUrl && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSnapshotUrl(null); }}>
                    <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-[scale-in_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
                        <div className="relative w-full">
                            <img src={snapshotUrl} alt="Confession Snapshot" className="w-full rounded-3xl shadow-2xl border border-[var(--ui-border)]" />
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSnapshotUrl(null); }}
                                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button 
                                onClick={handleSaveSnapshot}
                                className="flex-1 py-3 px-4 rounded-xl bg-[var(--ui-accent)] text-white font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                            >
                                <Download className="h-4 w-4" /> Save
                            </button>
                            <button 
                                onClick={handleShareSnapshot}
                                className="flex-1 py-3 px-4 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-[var(--ui-text)] font-semibold hover:bg-[var(--ui-bg-hover)] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                            >
                                <Share2 className="h-4 w-4" /> Share
                            </button>
                        </div>
                        <p className="text-[11px] text-white/60 text-center">Tap Save to store in gallery, or Share to send directly.</p>
                    </div>
                </div>
            )}
            
            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReportModal(false); }}>
                    <div className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-[scale-in_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-[var(--ui-divider)]">
                            <h3 className="font-bold text-[var(--ui-text)]">Report Confession</h3>
                            <p className="text-xs text-[var(--ui-text-muted)] mt-1">Why are you reporting this?</p>
                        </div>
                        <div className="p-2">
                            {['Spam', 'Harassment', 'Offensive content', 'Personal information', 'Other'].map(reason => (
                                <button
                                    key={reason}
                                    onClick={(e) => { e.preventDefault(); handleReport(reason); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] rounded-xl transition-colors"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 pt-2">
                            <button 
                                onClick={(e) => { e.preventDefault(); setShowReportModal(false); }}
                                className="w-full py-2.5 rounded-xl bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] font-semibold hover:bg-[var(--ui-bg-hover)] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        
        </>
    );

    if (linkToDetail) {
        return (
            <>
                <Link href={`/confessions/${confession.id}`} className="block">
                    {CardContent}
                </Link>
                {reportModal}
            </>
        );
    }

    return (
        <>
            {CardContent}
            {reportModal}
        </>
    );

}
