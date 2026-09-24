'use client';

import { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Smile, Gift, Mic, Plus } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { GiphyGif } from '@/lib/giphy';
import { ChatInputFeatures } from './types';

const EmojiPicker = lazy(() => import('@/components/EmojiPicker'));
const GiphyPicker = lazy(() => import('@/components/GiphyPicker'));
const AudioRecorder = lazy(() => import('@/components/AudioRecorder'));

interface InputActionsProps {
    features: Required<ChatInputFeatures>;
    uploading: boolean;
    sending: boolean;
    disabled: boolean;
    onEmojiSelect: (emoji: string) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGifSelect: (gif: GiphyGif) => void;
    onAudioUploaded: (url: string) => void;
}

const dockVariants: Variants = {
    hidden: { 
        opacity: 0, 
        y: 12, 
        scale: 0.92,
        transition: { duration: 0.15, ease: 'easeOut' }
    },
    visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 420,
            damping: 26,
            staggerChildren: 0.04,
            delayChildren: 0.02
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8, scale: 0.85 },
    visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 450,
            damping: 24
        }
    }
};

export default function InputActions({
    features,
    uploading,
    sending,
    disabled,
    onEmojiSelect,
    onImageUpload,
    onGifSelect,
    onAudioUploaded,
}: InputActionsProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(false);

    // Auto-close on click outside or escape key
    useEffect(() => {
        if (!expanded) return;

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpanded(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [expanded]);

    return (
        <div className="relative flex items-center shrink-0" ref={containerRef}>
            {/* The + / x Animated Toggle Button */}
            <motion.button 
                type="button"
                onClick={() => setExpanded(prev => !prev)}
                animate={{ rotate: expanded ? 45 : 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all duration-300 ${
                    expanded
                        ? 'bg-[var(--ui-text)] text-[var(--ui-bg-base)] shadow-lg'
                        : 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-white shadow-sm'
                }`}
                title={expanded ? 'Close actions' : 'Add attachment or media'}
                aria-expanded={expanded}
            >
                <Plus className="w-5 h-5 transition-transform" />
            </motion.button>

            {/* Hidden native file input */}
            {features.image && (
                <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    className="hidden"
                    onChange={(e) => {
                        onImageUpload(e);
                        setExpanded(false);
                    }}
                />
            )}

            {/* Floating Action Dock (Floats gracefully above the input bar) */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        variants={dockVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="absolute bottom-full left-0 mb-3 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--ui-bg-surface)]/95 backdrop-blur-2xl border border-[var(--ui-border)] shadow-[0_16px_40px_rgba(0,0,0,0.35)] select-none max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-hide"
                    >
                        {/* 1. Photo Action */}
                        {features.image && (
                            <motion.button
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.94 }}
                                type="button"
                                onClick={() => {
                                    imageInputRef.current?.click();
                                    setExpanded(false);
                                }}
                                disabled={uploading || disabled}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0 group"
                                title="Attach photo"
                            >
                                <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold">Photo</span>
                            </motion.button>
                        )}

                        {/* 2. Emoji Action */}
                        {features.emoji && (
                            <Suspense fallback={null}>
                                <EmojiPicker
                                    onSelect={(emoji) => {
                                        onEmojiSelect(emoji);
                                        setExpanded(false);
                                    }}
                                    trigger={
                                        <motion.button
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.05, y: -1 }}
                                            whileTap={{ scale: 0.94 }}
                                            type="button"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer shrink-0 group"
                                            title="Add emoji"
                                        >
                                            <Smile className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-semibold">Emoji</span>
                                        </motion.button>
                                    }
                                />
                            </Suspense>
                        )}

                        {/* 3. GIF Action */}
                        {features.gif && (
                            <div className="shrink-0">
                                <Suspense fallback={null}>
                                    <GiphyPicker
                                        onSelect={(gif) => {
                                            onGifSelect(gif);
                                            setExpanded(false);
                                        }}
                                        disabled={disabled || uploading || sending}
                                        trigger={
                                            <motion.button
                                                variants={itemVariants}
                                                whileHover={{ scale: 1.05, y: -1 }}
                                                whileTap={{ scale: 0.94 }}
                                                type="button"
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 dark:text-pink-400 border border-pink-500/20 transition-all cursor-pointer disabled:opacity-50 group"
                                                title="Add GIF"
                                            >
                                                <Gift className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-semibold">GIF</span>
                                            </motion.button>
                                        }
                                    />
                                </Suspense>
                            </div>
                        )}

                        {/* 4. Voice Action */}
                        {features.voice && (
                            <div className="shrink-0">
                                <Suspense fallback={null}>
                                    <AudioRecorder
                                        onAudioUploaded={(url) => {
                                            onAudioUploaded(url);
                                            setExpanded(false);
                                        }}
                                        disabled={disabled || uploading || sending}
                                        trigger={
                                            <motion.button
                                                variants={itemVariants}
                                                whileHover={{ scale: 1.05, y: -1 }}
                                                whileTap={{ scale: 0.94 }}
                                                type="button"
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50 group"
                                                title="Voice note"
                                            >
                                                <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-semibold">Voice</span>
                                            </motion.button>
                                        }
                                    />
                                </Suspense>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Inline Action Shortcuts (hidden on mobile, sleek on desktop) */}
            <div className="hidden sm:flex items-center gap-1 ml-1.5">
                {features.image && (
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' }}
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading || disabled}
                        className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-blue-400 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Attach photo"
                    >
                        <ImageIcon className="w-4.5 h-4.5" />
                    </motion.button>
                )}

                {features.emoji && (
                    <Suspense fallback={null}>
                        <EmojiPicker
                            onSelect={onEmojiSelect}
                            trigger={
                                <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                    whileTap={{ scale: 0.92 }}
                                    type="button"
                                    className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-yellow-400 transition-colors cursor-pointer"
                                    title="Add emoji"
                                >
                                    <Smile className="w-4.5 h-4.5" />
                                </motion.button>
                            }
                        />
                    </Suspense>
                )}

                {features.gif && (
                    <Suspense fallback={null}>
                        <GiphyPicker
                            onSelect={onGifSelect}
                            disabled={disabled || uploading || sending}
                            trigger={
                                <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                    whileTap={{ scale: 0.92 }}
                                    type="button"
                                    className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-pink-400 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Add GIF"
                                >
                                    <Gift className="w-4.5 h-4.5" />
                                </motion.button>
                            }
                        />
                    </Suspense>
                )}

                {features.voice && (
                    <Suspense fallback={null}>
                        <AudioRecorder
                            onAudioUploaded={onAudioUploaded}
                            disabled={disabled || uploading || sending}
                            trigger={
                                <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                    whileTap={{ scale: 0.92 }}
                                    type="button"
                                    className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Voice message"
                                >
                                    <Mic className="w-4.5 h-4.5" />
                                </motion.button>
                            }
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
