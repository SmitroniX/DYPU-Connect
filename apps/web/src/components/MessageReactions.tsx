'use client';

import { useRef, useState, useEffect } from 'react';
import { Smile, Reply } from 'lucide-react';
import { QUICK_REACTIONS } from '@/lib/emojis';

/* ── Message Hover Toolbar ── */

interface HoverToolbarProps {
    onReact: (emoji: string) => void;
    onReply?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    isMine?: boolean;
}

export function MessageHoverToolbar({ onReact, onReply, onEdit, onDelete, isMine }: HoverToolbarProps) {
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
            {isMine && onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                    title="Edit"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            )}
            {isMine && onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    );
}

/* ── Message Reactions Display ── */

interface MessageReactionsProps {
    reactions: Record<string, string[]>;
    currentUserId: string;
    onToggle?: (emoji: string) => void;
}

export function MessageReactions({ reactions, currentUserId, onToggle }: MessageReactionsProps) {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactions).map(([emoji, uids]) => {
                const hasReacted = uids.includes(currentUserId);
                return (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => onToggle?.(emoji)}
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

