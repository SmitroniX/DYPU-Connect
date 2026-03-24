'use client';

import { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { uploadChatMedia } from '@/lib/storage';
import { compressImage, generateBlurHash } from '@/lib/media';
import type { GiphyGif } from '@/lib/giphy';

import { ChatInputPayload, ChatInputFeatures, Message } from './ChatInput/types';
import AttachmentPreview from './ChatInput/AttachmentPreview';
import MarkdownToolbar from './ChatInput/MarkdownToolbar';
import InputActions from './ChatInput/InputActions';
import SendButton from './ChatInput/SendButton';

export type { ChatInputPayload, ChatInputFeatures };

interface ChatInputProps {
    onSend: (payload: ChatInputPayload) => Promise<void> | void;
    placeholder?: string;
    disabled?: boolean;
    maxLength?: number;
    features?: ChatInputFeatures;
    typingIndicator?: React.ReactNode;
    onTyping?: (isTyping: boolean) => void;
    onStopTyping?: () => void;
    chatId?: string;
    replyToMessage?: Message | null;
    onCancelReply?: () => void;
}

const DEFAULT_FEATURES: Required<ChatInputFeatures> = {
    emoji: true,
    gif: true,
    image: true,
    markdown: true,
    voice: true,
};

export default function ChatInput({
    onSend,
    placeholder = 'Type a message...',
    disabled = false,
    maxLength = 2000,
    features: featuresProp,
    typingIndicator,
    onTyping,
    onStopTyping,
    chatId,
    replyToMessage,
    onCancelReply,
}: ChatInputProps) {
    const features = { ...DEFAULT_FEATURES, ...featuresProp };
    const [message, setMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [selectedBlurHash, setSelectedBlurHash] = useState('');
    const [selectedAudioUrl, setSelectedAudioUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea when replying
    useEffect(() => {
        if (replyToMessage && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyToMessage]);

    const canSend = !disabled && !sending && (message.trim() || selectedGifUrl || selectedImageUrl || selectedAudioUrl);
    const showCharCount = message.length > maxLength * 0.8;
    const overLimit = message.length > maxLength;

    const handleSend = async () => {
        if (!canSend || overLimit) return;
        setSending(true);
        onStopTyping?.();
        try {
            await onSend({
                text: message.trim(),
                gifUrl: selectedGifUrl || undefined,
                imageUrl: selectedImageUrl || undefined,
                blurHash: selectedBlurHash || undefined,
                audioUrl: selectedAudioUrl || undefined,
            });
            setMessage('');
            setSelectedGifUrl('');
            setSelectedImageUrl('');
            setSelectedBlurHash('');
            setSelectedAudioUrl('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch {
            toast.error('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
        onTyping?.(true);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    };

    const insertEmoji = (emoji: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = message.slice(0, start) + emoji + message.slice(end);
            setMessage(newText);
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
                textarea.focus();
            });
        } else {
            setMessage((prev) => prev + emoji);
        }
    };

    const wrapSelection = (before: string, after: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = message.slice(start, end);
        const newText = message.slice(0, start) + before + selected + after + message.slice(end);
        setMessage(newText);
        requestAnimationFrame(() => {
            if (selected) {
                textarea.selectionStart = start + before.length;
                textarea.selectionEnd = end + before.length;
            } else {
                textarea.selectionStart = textarea.selectionEnd = start + before.length;
            }
            textarea.focus();
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file.');
            return;
        }

        setUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const blurHashPromise = generateBlurHash(compressedFile);
            const url = await uploadChatMedia(compressedFile, chatId || 'general');
            const blurHash = await blurHashPromise;

            setSelectedImageUrl(url);
            setSelectedBlurHash(blurHash);
            toast.success('Image attached!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Image upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveAttachments = () => {
        setSelectedGifUrl('');
        setSelectedImageUrl('');
        setSelectedBlurHash('');
        setSelectedAudioUrl('');
    };

    return (
        <div className="px-4 pb-4 shrink-0 relative bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent pt-4">
            <AnimatePresence>
                {typingIndicator && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -top-6 left-6 h-6 flex items-center"
                    >
                        {typingIndicator}
                    </motion.div>
                )}
            </AnimatePresence>

            <AttachmentPreview
                selectedGifUrl={selectedGifUrl}
                selectedImageUrl={selectedImageUrl}
                selectedAudioUrl={selectedAudioUrl}
                replyToMessage={replyToMessage}
                onRemove={handleRemoveAttachments}
                onRemoveReply={onCancelReply}
            />

            <div className="flex flex-col bg-[var(--ui-bg-elevated)]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[26px] border border-white/5 focus-within:border-[var(--ui-accent)]/40 focus-within:ring-4 focus-within:ring-[var(--ui-accent)]/10 transition-all duration-300 relative z-20 overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-[var(--ui-accent)]/0 via-[var(--ui-accent)]/5 to-[var(--ui-accent)]/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                {features.markdown && (
                    <MarkdownToolbar onWrapSelection={wrapSelection} />
                )}

                <div className="flex items-end gap-1 px-2 pb-2 pt-1 relative z-10">
                    <InputActions
                        features={features}
                        uploading={uploading}
                        sending={sending}
                        disabled={disabled}
                        onEmojiSelect={insertEmoji}
                        onImageUpload={handleImageUpload}
                        onGifSelect={(gif) => setSelectedGifUrl(gif.url)}
                        onAudioUploaded={(url) => setSelectedAudioUrl(url)}
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-end pt-1">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder={replyToMessage ? `Reply to ${replyToMessage.senderName}...` : placeholder}
                            disabled={disabled}
                            maxLength={maxLength}
                            className="w-full bg-transparent text-[15px] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none resize-none overflow-y-auto min-h-[40px] max-h-[160px] py-2 px-1 scrollbar-hide"
                            rows={1}
                        />
                    </div>

                    <SendButton
                        canSend={canSend}
                        overLimit={overLimit}
                        showCharCount={showCharCount}
                        messageLength={message.length}
                        maxLength={maxLength}
                        onSend={handleSend}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between px-1 mt-1">
                <p className="text-[9px] text-[var(--ui-text-muted)]">
                    <kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-elevated)] text-[8px] font-mono">Enter</kbd> send · <kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-elevated)] text-[8px] font-mono">Shift+Enter</kbd> new line
                </p>
            </div>
        </div>
    );
}
