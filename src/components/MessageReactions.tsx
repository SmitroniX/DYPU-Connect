'use client';

import { useRef, useState, useEffect } from 'react';
import { Smile, Reply } from 'lucide-react';
import { QUICK_REACTIONS } from '@/lib/emojis';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import toast from 'react-hot-toast';

/* ── Message Hover Toolbar ── */

interface HoverToolbarProps {
    onReact: (emoji: string) => void;
    onReply?: () => void;
}

export function MessageHoverToolbar({ onReact, onReply }: HoverToolbarProps) {
    const [showReactions, setShowReactions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showReactions) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowReactions(false);
            }
        };
        window.addEventListener('mousedown', handler);
        return () => window.removeEventListener('mousedown', handler);
    }, [showReactions]);

    return (
        <div
            ref={wrapperRef}
            className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
        >
            {showReactions && (
                <div className="flex items-center gap-0.5 px-1 animate-[fade-in-up_0.1s_ease-out]">
                    {QUICK_REACTIONS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => { onReact(emoji); setShowReactions(false); }}
                            className="flex items-center justify-center h-7 w-7 rounded-md text-base hover:bg-[var(--ui-bg-hover)] hover:scale-125 transition-all"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                title="React"
            >
                <Smile className="w-3.5 h-3.5" />
            </button>
            {onReply && (
                <button
                    type="button"
                    onClick={onReply}
                    className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                    title="Reply"
                >
                    <Reply className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

/* ── Message Reactions Display ── */

interface MessageReactionsProps {
    messageRef: DocumentReference;
    reactions: Record<string, string[]>;
    currentUserId: string;
}

export function MessageReactions({ messageRef, reactions, currentUserId }: MessageReactionsProps) {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    const toggleReaction = async (emoji: string) => {
        try {
            const current = reactions[emoji] ?? [];
            const hasReacted = current.includes(currentUserId);
            const updated = hasReacted
                ? current.filter((uid) => uid !== currentUserId)
                : [...current, currentUserId];

            const newReactions = { ...reactions };
            if (updated.length === 0) {
                delete newReactions[emoji];
            } else {
                newReactions[emoji] = updated;
            }

            await updateDoc(messageRef, { reactions: newReactions });
        } catch {
            toast.error('Failed to update reaction.');
        }
    };

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactions).map(([emoji, uids]) => {
                const hasReacted = uids.includes(currentUserId);
                return (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(emoji)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all ${
                            hasReacted
                                ? 'bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/40 text-[var(--ui-accent)]'
                                : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)]'
                        }`}
                    >
                        <span className="text-sm">{emoji}</span>
                        <span className="font-semibold">{uids.length}</span>
                    </button>
                );
            })}
        </div>
    );
}

