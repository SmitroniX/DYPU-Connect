'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolveProfileImage } from '@/lib/profileImage';
import type { UserProfile } from '@/types/profile';
import { MessageSquare, X, Globe, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface ProfilePopupProps {
    userId: string;
    anchorRect: DOMRect | null;
    onClose: () => void;
}

// In-memory cache for fetched profiles
const profileCache = new Map<string, UserProfile>();

export default function ProfilePopup({ userId, anchorRect, onClose }: ProfilePopupProps) {
    const [profile, setProfile] = useState<UserProfile | null>(profileCache.get(userId) ?? null);
    const cachedProfile = profileCache.get(userId);
    const [profile, setProfile] = useState<UserProfile | null>(cachedProfile ?? null);
    const [loading, setLoading] = useState(!cachedProfile);

    useEffect(() => {
        if (profileCache.has(userId)) {
            return;
        }

        let cancelled = false;
        setLoading(true);
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

    // Position: try to place above the click, or below if not enough space
    const top = anchorRect.top > 300
        ? anchorRect.top - 10
        : anchorRect.bottom + 10;
    const left = Math.min(anchorRect.left, window.innerWidth - 300);
    const transformOrigin = anchorRect.top > 300 ? 'bottom left' : 'top left';

    return (
        <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
            <div
                ref={popupRef}
                className="absolute w-72 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] shadow-2xl overflow-hidden animate-[fade-in-up_0.15s_ease-out]"
                style={{
                    top: `${top}px`,
                    left: `${left}px`,
                    pointerEvents: 'auto',
                    transformOrigin,
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="h-6 w-6 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                    </div>
                ) : !profile ? (
                    <div className="p-4 text-center text-sm text-[var(--ui-text-muted)]">Profile not found.</div>
                ) : (
                    <>
                        {/* Banner */}
                        <div className="h-16 bg-linear-to-br from-[var(--ui-accent)]/30 via-[var(--ui-bg-surface)] to-[var(--ui-bg-elevated)] relative">
                            <button
                                onClick={onClose}
                                className="absolute top-2 right-2 p-1 rounded-md bg-[var(--ui-bg-surface)]/70 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Avatar + Info */}
                        <div className="px-4 pb-4 -mt-8">
                            <div className="flex items-end gap-3 mb-3">
                                <img
                                    src={resolveProfileImage(profile.profileImage, profile.email, profile.name)}
                                    alt={profile.name}
                                    className="h-16 w-16 rounded-xl ring-4 ring-[var(--ui-bg-surface)] object-cover"
                                />
                                <div className="flex-1 min-w-0 pb-1">
                                    <h3 className="text-sm font-bold text-[var(--ui-text)] truncate">{profile.name}</h3>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] truncate">{profile.email}</p>
                                </div>
                            </div>

                            {/* Bio */}
                            {profile.bio && (
                                <p className="text-xs text-[var(--ui-text-secondary)] italic mb-3 line-clamp-2">
                                    &ldquo;{profile.bio}&rdquo;
                                </p>
                            )}

                            {/* Academic info */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-text-secondary)]">
                                    <GraduationCap className="h-3 w-3" /> {profile.field}
                                </span>
                                {profile.branch && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-text-secondary)]">
                                        {profile.branch}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-text-secondary)]">
                                    {profile.year}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-text-secondary)]">
                                    <Globe className="h-3 w-3" /> {profile.accountVisibility === 'public' ? 'Public' : 'Private'}
                                </span>
                            </div>

                            {/* Action */}
                            <Link
                                href={`/messages`}
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--ui-accent)] px-3 py-2 text-xs font-semibold text-[var(--ui-bg-elevated)] hover:bg-[var(--ui-accent-hover)] transition-colors"
                            >
                                <MessageSquare className="h-3.5 w-3.5" /> Send Message
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

