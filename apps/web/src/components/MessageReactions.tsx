'use client';

import { useRef, useState, useEffect } from 'react';
import { Smile, Reply } from 'lucide-react';
import { QUICK_REACTIONS } from '@/lib/emojis';
import { motion, AnimatePresence } from 'framer-motion';

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
            className="absolute -top-3.5 right-2 flex items-center gap-0.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)]/95 backdrop-blur-md shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1.5 transition-all duration-200 ease-out z-20 p-0.5"
        >
            <AnimatePresence>
                {showReactions && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.85, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 4 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                        className="flex items-center gap-0.5 px-1 bg-[var(--ui-bg-base)]/80 rounded-lg mr-0.5 border border-[var(--ui-border)]/40"
                    >
                        {QUICK_REACTIONS.map((emoji) => (
                            <motion.button
                                key={emoji}
                                whileHover={{ scale: 1.35 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => { onReact(emoji); setShowReactions(false); }}
                                className="flex items-center justify-center h-7 w-7 rounded-md text-base hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                            >
                                {emoji}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                title="React"
                aria-label="Add reaction"
            >
                <Smile className="w-3.5 h-3.5" />
            </motion.button>

            {onReply && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={onReply}
                    className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                    title="Reply"
                    aria-label="Reply to message"
                >
                    <Reply className="w-3.5 h-3.5" />
                </motion.button>
            )}

            {isMine && onEdit && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={onEdit}
                    className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                    title="Edit"
                    aria-label="Edit message"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </motion.button>
            )}

            {isMine && onDelete && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={onDelete}
                    className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete"
                    aria-label="Delete message"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </motion.button>
            )}
        </div>
    );
}

/* ── Message Reactions Display with Spring Pop ── */

interface MessageReactionsProps {
    reactions: Record<string, string[]>;
    currentUserId: string;
    onToggle?: (emoji: string) => void;
}

export function MessageReactions({ reactions, currentUserId, onToggle }: MessageReactionsProps) {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            <AnimatePresence>
                {Object.entries(reactions).map(([emoji, uids]) => {
                    const hasReacted = uids.includes(currentUserId);
                    return (
                        <motion.button
                            key={emoji}
                            layout
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                            type="button"
                            onClick={() => onToggle?.(emoji)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur-md transition-colors shadow-xs cursor-pointer ${
                                hasReacted
                                    ? 'bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/50 text-[var(--ui-accent)]'
                                    : 'bg-[var(--ui-bg-surface)]/85 text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] border border-[var(--ui-border)]/60'
                            }`}
                        >
                            <span className="text-sm select-none">{emoji}</span>
                            <span className={`text-[10px] font-bold ${hasReacted ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)]'}`}>
                                {uids.length}
                            </span>
                        </motion.button>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
