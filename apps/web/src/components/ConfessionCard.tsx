'use client';

import { useState, useRef, useEffect } from 'react';
import { Confession, getMood, cardGradient } from '@/lib/confessions';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import {
    Heart, MessageCircle, Ghost, Clock, Quote,
    Share2, Camera, MoreVertical, Flag, Download, X, Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { filterProfanity } from '@/lib/security';
import { shareToAndroid, isAndroidApp, shareImageToAndroid, saveImageToAndroid } from '@/lib/android';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfessionCardProps {
    confession: Confession;
    linkToDetail?: boolean;
    onCommentClick?: () => void;
}

export default function ConfessionCard({ confession, linkToDetail = true, onCommentClick }: ConfessionCardProps) {
    const router = useRouter();
    const cardRef = useRef<HTMLElement>(null);
    const { user } = useAuth();
    const { userProfile } = useStore();
    
    // State
    const [optimisticDelta, setOptimisticDelta] = useState(0);
    const likesCount = Math.max(0, (confession.likesCount || 0) + optimisticDelta);
    const commentsCount = confession.commentsCount || 0;
    const [isLiked, setIsLiked] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
    
    // UI state
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
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
        const delta = previousIsLiked ? -1 : 1;
        
        setIsLiked(!previousIsLiked);
        setOptimisticDelta(prev => prev + delta);
        
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
            setOptimisticDelta(prev => prev - delta);
            toast.error('Failed to update like status');
        } finally {
            setLikeLoading(false);
        }
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onCommentClick) {
            onCommentClick();
            return;
        }
        if (linkToDetail) {
            router.push(`/confessions/${confession.id}#comments`);
        } else {
            const input = document.getElementById('comment-input');
            if (input) {
                input.scrollIntoView({ behavior: 'smooth' });
                input.focus();
            } else {
                router.push(`/confessions/${confession.id}#comments`);
            }
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const url = `${window.location.origin}/confessions/${confession.id}`;
        const filtered = filterProfanity(confession.text);
        const text = `"${filtered.slice(0, 100)}${filtered.length > 100 ? '…' : ''}" — Read this confession on DYPU Connect!`;
        
        if (isAndroidApp()) {
            shareToAndroid(`${text}\n\n${url}`, 'DYPU Connect Confession');
            return;
        }

        if (navigator.share) {
            try { 
                await navigator.share({ title: 'DYPU Connect Confession', text, url });
                return;
            } catch (error) { 
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.log(error);
                }
            }
        }
        
        try {
            await navigator.clipboard.writeText(`${text}\n\n${url}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Link copied to clipboard!');
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
                pixelRatio: 1.5,
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

    const handleSaveSnapshot = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!snapshotUrl) return;

        const filename = `Confession_${confession.id}.png`;

        // 1. Native Android bridge method (when available on APK)
        if (isAndroidApp() && saveImageToAndroid(snapshotUrl, filename)) {
            return;
        }

        // 2. Android WebView without native saveImage (prevents data: URL crash)
        if (isAndroidApp()) {
            if (shareImageToAndroid(snapshotUrl, 'Confession Snapshot')) {
                return;
            }
            try {
                const res = await fetch(snapshotUrl);
                const blob = await res.blob();
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'DYPU Connect Confession',
                    });
                    return;
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Android share fallback error:', err);
                }
            }
            toast('Long-press the image to save directly to your gallery!', { icon: '👆', duration: 4500 });
            return;
        }

        // 3. Web browser / Desktop download via safe Blob URL
        try {
            const res = await fetch(snapshotUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = blobUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            toast.success('Download started!');
        } catch {
            const link = document.createElement('a');
            link.download = filename;
            link.href = snapshotUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Download started!');
        }
    };

    const handleShareSnapshot = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!snapshotUrl) return;

        // 1. Native Android bridge share
        if (isAndroidApp() && shareImageToAndroid(snapshotUrl, 'Confession from DYPU Connect')) {
            return;
        }

        // 2. WebShare API with File
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
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error('Share error:', err);
            }
            return;
        }

        // 3. If in Android without WebShare, prompt to long press
        if (isAndroidApp()) {
            toast('Long-press the image to share or save!', { icon: '👆', duration: 4000 });
            return;
        }

        // 4. Desktop fallback to save
        handleSaveSnapshot(e);
    };

    const handleReport = async (reason: string) => {
        if (!user) {
            toast.error("You must be logged in to report.");
            return;
        }
        
        try {
            const previewText = (confession as any).content ? (confession as any).content : (confession.text || '');
            await addDoc(collection(db, 'reports'), {
                reportedContentId: confession.id,
                targetId: confession.id,
                contentType: 'confession',
                targetType: 'confession',
                contentPreview: previewText ? previewText.slice(0, 200) : '',
                reason,
                reporterId: user.uid,
                reportedBy: user.uid,
                reporterEmail: user.email || '',
                reporterName: userProfile?.name || user.displayName || 'Student',
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
            className={`group relative rounded-2xl sm:rounded-3xl border ${borderColor} bg-[var(--ui-bg-surface)]/85 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-[var(--ui-accent)]/50 hover:shadow-xl hover:shadow-[var(--ui-accent)]/10 hover:-translate-y-0.5`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none opacity-75 group-hover:opacity-100 transition-opacity`} />

            <div className="relative p-5 sm:p-7 flex flex-col h-full">
                {/* Header: Author & Mood badge + Time & Actions */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {confession.mood ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full ${mood.bg} border ${borderColor} px-3 py-1 text-[11px] font-extrabold tracking-wide ${mood.accent} shadow-sm backdrop-blur-sm`}>
                                {mood.label}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 px-3 py-1 text-[11px] font-extrabold tracking-wide text-[var(--ui-accent)] shadow-sm">
                                <Ghost className="h-3 w-3" /> Anonymous
                            </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-elevated)]/80 border border-[var(--ui-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--ui-text-secondary)] shadow-sm backdrop-blur-sm">
                            <Ghost className="h-3 w-3 text-[var(--ui-accent)]" />
                            <span>{confession.anonymousName}</span>
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-[var(--ui-text-muted)] flex items-center gap-1 bg-[var(--ui-bg-elevated)]/60 px-2 py-0.5 rounded-md border border-[var(--ui-border)]/50">
                            <Clock className="h-3 w-3" />
                            {timeAgo}
                        </span>
                        
                        <div className="relative more-menu-container">
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
                                className="p-1 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors active:scale-95"
                                title="More options"
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
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <Quote className="h-7 w-7 text-[var(--ui-accent)]/20 mb-2.5 shrink-0" />

                {/* Confession text */}
                <p className="text-[15px] sm:text-[16px] leading-relaxed text-[var(--ui-text)] whitespace-pre-wrap break-words font-medium flex-1">
                    {filterProfanity(confession.text)}
                </p>

                {/* Bottom author signature */}
                <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[var(--ui-accent)]/20 to-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/30 flex items-center justify-center text-[var(--ui-accent)] text-xs font-black shadow-sm">
                            {(confession.anonymousName || 'Anonymous').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--ui-text)]">
                                {confession.anonymousName || 'Anonymous'}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--ui-text-muted)]">
                                DYPU Connect • Encrypted
                            </span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-[var(--ui-divider)] my-4" data-html2canvas-ignore />

                {/* Actions: Spring Pop Like Button, Comments, Snap, Share */}
                <div className="flex items-center justify-between" data-html2canvas-ignore>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Like Button with spring pop micro-interaction */}
                        <motion.button
                            onClick={handleLike}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: "spring", stiffness: 450, damping: 15 }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                                isLiked 
                                ? 'text-pink-500 bg-pink-500/15 border border-pink-500/30' 
                                : 'text-[var(--ui-text-muted)] hover:text-pink-400 hover:bg-pink-500/10 border border-transparent'
                            }`}
                        >
                            <motion.div
                                animate={isLiked ? { scale: [1, 1.35, 1], rotate: [0, -10, 10, 0] } : { scale: 1, rotate: 0 }}
                                transition={{ duration: 0.35, type: "spring", stiffness: 400, damping: 15 }}
                            >
                                <Heart className={`h-4 w-4 transition-colors ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                            </motion.div>
                            <span>{likesCount}</span>
                        </motion.button>
                        
                        {/* Comments button */}
                        <motion.button
                            type="button"
                            onClick={handleCommentClick}
                            whileTap={{ scale: 0.92 }}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[var(--ui-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
                            title="Comments"
                            aria-label="Comments"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span>{commentsCount}</span>
                        </motion.button>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {/* Snap Button */}
                        <motion.button
                            onClick={handleScreenshot}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center gap-1.5"
                            title="Generate snapshot card"
                        >
                            <Camera className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:block">Snap</span>
                        </motion.button>

                        {/* Share Button */}
                        <motion.button
                            onClick={handleShare}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-all"
                            title="Share link"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                        </motion.button>
                    </div>
                </div>
            </div>
        </article>
    );

    const modals = (
        <AnimatePresence>
            {/* Snapshot Modal with smooth backdrop blur and scale-in spring */}
            {snapshotUrl && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
                    style={{ paddingTop: 'max(var(--safe-top), 16px)', paddingBottom: 'max(var(--safe-bottom), 16px)' }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSnapshotUrl(null); }}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="w-full max-w-sm my-auto flex flex-col items-center gap-3" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative w-full flex justify-center">
                            <img 
                                src={snapshotUrl} 
                                alt="Confession Snapshot" 
                                className="max-h-[62vh] w-auto max-w-full rounded-2xl shadow-2xl border border-[var(--ui-border)] object-contain" 
                            />
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSnapshotUrl(null); }}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors cursor-pointer shadow-md"
                                title="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 w-full pt-1">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleSaveSnapshot}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--ui-accent)] text-white font-bold shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                            >
                                <Download className="h-4 w-4" /> Save
                            </motion.button>
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleShareSnapshot}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-[var(--ui-text)] font-bold hover:bg-[var(--ui-bg-hover)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                            >
                                <Share2 className="h-4 w-4" /> Share
                            </motion.button>
                        </div>
                        <p className="text-[11px] text-white/70 text-center font-medium">Tap Save to store, or Share to send directly.</p>
                    </motion.div>
                </motion.div>
            )}
            
            {/* Report Modal with smooth backdrop blur and scale-in spring */}
            {showReportModal && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReportModal(false); }}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.92, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-[var(--ui-divider)]">
                            <h3 className="font-extrabold text-[var(--ui-text)] text-base">Report Confession</h3>
                            <p className="text-xs text-[var(--ui-text-muted)] mt-1 font-medium">Help keep DYPU-Connect safe. Why are you reporting this?</p>
                        </div>
                        <div className="p-3 space-y-1">
                            {['Spam', 'Harassment', 'Offensive content', 'Personal information', 'Other'].map(reason => (
                                <button
                                    key={reason}
                                    onClick={(e) => { e.preventDefault(); handleReport(reason); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] rounded-xl transition-colors"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 pt-2">
                            <button 
                                onClick={(e) => { e.preventDefault(); setShowReportModal(false); }}
                                className="w-full py-2.5 rounded-xl bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] font-bold hover:bg-[var(--ui-bg-hover)] transition-colors text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if (linkToDetail) {
        return (
            <>
                <Link href={`/confessions/${confession.id}`} className="block">
                    {CardContent}
                </Link>
                {modals}
            </>
        );
    }

    return (
        <>
            {CardContent}
            {modals}
        </>
    );
}
