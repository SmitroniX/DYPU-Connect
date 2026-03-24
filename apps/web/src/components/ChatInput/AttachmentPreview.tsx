'use client';

import { X, Reply } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message } from './types';

interface AttachmentPreviewProps {
    selectedGifUrl?: string;
    selectedImageUrl?: string;
    selectedAudioUrl?: string;
    replyToMessage?: Message | null;
    onRemove: () => void;
    onRemoveReply?: () => void;
}

export default function AttachmentPreview({
    selectedGifUrl,
    selectedImageUrl,
    selectedAudioUrl,
    replyToMessage,
    onRemove,
    onRemoveReply,
}: AttachmentPreviewProps) {
    const hasMedia = !!(selectedGifUrl || selectedImageUrl || selectedAudioUrl);

    if (!hasMedia && !replyToMessage) return null;

    return (
        <div className="absolute bottom-full left-4 mb-2 flex flex-col gap-2 z-10 w-fit max-w-[calc(100%-2rem)]">
            {/* Reply Preview */}
            {replyToMessage && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-[var(--ui-bg-surface)]/90 border border-[var(--ui-border)]/50 p-3 pr-10 flex items-start gap-3 shadow-lg backdrop-blur-md relative group"
                >
                    <div className="p-1.5 rounded-lg bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]">
                        <Reply className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[var(--ui-text)] truncate">
                            Replying to {replyToMessage.senderName || 'User'}
                        </p>
                        <p className="text-[11px] text-[var(--ui-text-muted)] truncate mt-0.5">
                            {replyToMessage.text || (replyToMessage.imageUrl ? 'Photo' : replyToMessage.gifUrl ? 'GIF' : replyToMessage.audioUrl ? 'Voice Message' : 'Attachment')}
                        </p>
                    </div>
                    <button
                        onClick={onRemoveReply}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--ui-bg-hover)] text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] transition-all opacity-0 group-hover:opacity-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ui-accent)] rounded-l-2xl" />
                </motion.div>
            )}

            {/* Media Preview */}
            {hasMedia && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]/50 p-2 flex items-center gap-3 shadow-lg backdrop-blur-md"
                >
                    {selectedGifUrl && (
                        <div className="relative group overflow-hidden rounded-xl">
                            <img src={selectedGifUrl} alt="GIF" className="h-16 w-16 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <X className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    )}
                    {selectedImageUrl && (
                        <div className="relative group overflow-hidden rounded-xl">
                            <img src={selectedImageUrl} alt="Image" className="h-16 w-16 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-white/20 rounded-xl" />
                        </div>
                    )}
                    {selectedAudioUrl && (
                        <div className="relative group flex items-center">
                            <audio src={selectedAudioUrl} controls className="h-10 w-48" />
                        </div>
                    )}
                    <div className="flex-1 pr-2 pl-1">
                        <p className="text-[13px] font-medium text-[var(--ui-text)]">
                            {selectedAudioUrl ? 'Voice Note' : selectedGifUrl ? 'GIF attached' : 'Image attached'}
                        </p>
                        <button
                            type="button"
                            onClick={onRemove}
                            className="text-[11px] text-[var(--ui-danger)] hover:underline mt-0.5"
                        >
                            Remove attachment
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
