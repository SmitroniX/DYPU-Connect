'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolveProfileImage } from '@/lib/profileImage';
import type { UserProfile } from '@/types/profile';
import { MessageSquare, X, Globe, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfilePopupProps {
    userId: string;
    anchorRect: DOMRect | null;
    onClose: () => void;
}

// In-memory cache for fetched profiles
const profileCache = new Map<string, UserProfile>();

export default function ProfilePopup({ userId, anchorRect, onClose }: ProfilePopupProps) {
    const cachedProfile = profileCache.get(userId);
    const [profile, setProfile] = useState<UserProfile | null>(cachedProfile ?? null);
    const [loading, setLoading] = useState(!cachedProfile);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (profileCache.has(userId)) {
            return;
        }

        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) setLoading(true);
        });
        getDoc(doc(db, 'users', userId))
            .then((snap) => {
                if (cancelled) return;
                if (snap.exists()) {
                    const data = snap.data() as UserProfile;
                    profileCache.set(userId, data);
                    setProfile(data);
                }
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId]);

    // Click outside to close
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handler);
        return () => window.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Escape key to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!anchorRect) return null;

    const top = anchorRect.top > 300
        ? anchorRect.top - 10
        : anchorRect.bottom + 10;
    const left = Math.min(anchorRect.left, window.innerWidth - 300);
    const transformOrigin = anchorRect.top > 300 ? 'bottom left' : 'top left';

    return (
        <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
            <AnimatePresence>
                <motion.div
                    ref={popupRef}
                    initial={{ opacity: 0, scale: 0.95, y: anchorRect.top > 300 ? 10 : -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                    className="absolute w-72 glass-panel overflow-hidden"
                    style={{
                        top: `${top}px`,
                        left: `${left}px`,
                        pointerEvents: 'auto',
                        transformOrigin,
                    }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-6 w-6 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        </div>
                    ) : !profile ? (
                        <div className="p-6 text-center text-sm text-[var(--ui-text-muted)]">Profile not found.</div>
                    ) : (
                        <>
                            {/* Banner */}
                            <div className="h-20 bg-gradient-to-br from-[var(--ui-accent)]/40 via-[var(--ui-bg-surface)] to-[var(--ui-bg-base)] relative border-b border-[var(--ui-border)]">
                                <button
                                    onClick={onClose}
                                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 text-white/70 hover:text-white hover:bg-black/40 backdrop-blur-md transition-all"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Avatar + Info */}
                            <div className="px-5 pb-5 -mt-10">
                                <div className="flex items-end gap-3 mb-4 relative z-10">
                                    <img
                                        src={resolveProfileImage(profile.profileImage, profile.email, profile.name)}
                                        alt={profile.name}
                                        className="h-20 w-20 rounded-2xl ring-4 ring-[var(--ui-bg-surface)] shadow-xl object-cover bg-[var(--ui-bg-base)]"
                                    />
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-base font-bold text-white tracking-tight">{profile.name}</h3>
                                    <p className="text-xs text-[var(--ui-text-muted)] truncate">{profile.email}</p>
                                </div>

                                {/* Bio */}
                                {profile.bio && (
                                    <p className="text-sm text-[var(--ui-text-secondary)] mb-4 line-clamp-3 leading-relaxed">
                                        {profile.bio}
                                    </p>
                                )}

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-5">
                                    <span className="badge">
                                        <GraduationCap className="h-3.5 w-3.5" /> {profile.field}
                                    </span>
                                    {profile.branch && (
                                        <span className="badge">
                                            {profile.branch}
                                        </span>
                                    )}
                                    <span className="badge">
                                        {profile.year}
                                    </span>
                                    <span className="badge">
                                        <Globe className="h-3.5 w-3.5" /> {profile.accountVisibility === 'public' ? 'Public' : 'Private'}
                                    </span>
                                </div>

                                {/* Action */}
                                <Link
                                    href={`/messages`}
                                    onClick={onClose}
                                    className="btn-primary w-full"
                                >
                                    <MessageSquare className="h-4 w-4" /> Message
                                </Link>
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}