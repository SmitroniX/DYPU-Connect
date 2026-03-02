'use client';

import { useRef, useState } from 'react';
import { Bold, Code, Image as ImageIcon, Italic, Send, X } from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { useStore } from '@/store/useStore';
import {
    isGoogleDriveConfigured,
    requestGoogleDriveAccessToken,
    uploadImageToGoogleDrive,
} from '@/lib/googleDrive';
import toast from 'react-hot-toast';

export interface ChatInputPayload {
    text: string;
    gifUrl?: string;
    imageUrl?: string;
}

export interface ChatInputFeatures {
    emoji?: boolean;
    gif?: boolean;
    image?: boolean;
    markdown?: boolean;
}

interface ChatInputProps {
    onSend: (payload: ChatInputPayload) => Promise<void> | void;
    placeholder?: string;
    disabled?: boolean;
    maxLength?: number;
    features?: ChatInputFeatures;
    typingIndicator?: React.ReactNode;
}

const DEFAULT_FEATURES: Required<ChatInputFeatures> = {
    emoji: true,
    gif: true,
    image: true,
    markdown: true,
};

export default function ChatInput({
    onSend,
    placeholder = 'Type a message...',
    disabled = false,
    maxLength = 2000,
    features: featuresProp,
    typingIndicator,
}: ChatInputProps) {
    const features = { ...DEFAULT_FEATURES, ...featuresProp };
    const [message, setMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const { userProfile, driveAccessToken } = useStore();

    const canSend = !disabled && !sending && (message.trim() || selectedGifUrl || selectedImageUrl);
    const showCharCount = message.length > maxLength * 0.8;
    const overLimit = message.length > maxLength;

    const handleSend = async () => {
        if (!canSend || overLimit) return;
        setSending(true);
        try {
            await onSend({
                text: message.trim(),
                gifUrl: selectedGifUrl || undefined,
                imageUrl: selectedImageUrl || undefined,
            });
            setMessage('');
            setSelectedGifUrl('');
            setSelectedImageUrl('');
            // Reset textarea height
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
        // Auto-resize
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
            // Restore cursor position after emoji
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
        if (!isGoogleDriveConfigured() || !userProfile?.googleDrive) {
            toast.error('Connect Google Drive in Settings to upload images.');
            return;
        }

        setUploading(true);
        try {
            let accessToken: string;
            if (driveAccessToken) {
                accessToken = driveAccessToken;
            } else {
                try { accessToken = await requestGoogleDriveAccessToken(''); }
                catch { accessToken = await requestGoogleDriveAccessToken('consent'); }
            }
            const result = await uploadImageToGoogleDrive({
                accessToken,
                file,
                folderId: userProfile.googleDrive.folderId,
            });
            setSelectedImageUrl(result.directImageUrl);
            toast.success('Image uploaded!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Image upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const hasAttachment = !!(selectedGifUrl || selectedImageUrl);

    return (
        <div className="px-4 pb-4 shrink-0">
            {/* Typing indicator slot */}
            {typingIndicator && (
                <div className="h-6 flex items-center">{typingIndicator}</div>
            )}

            {/* Attachment preview */}
            {hasAttachment && (
                <div className="mb-2 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] p-2 flex items-center gap-3 animate-[fade-in-up_0.15s_ease-out]">
                    {selectedGifUrl && (
                        <img src={selectedGifUrl} alt="GIF" className="h-16 w-16 rounded-lg object-cover" />
                    )}
                    {selectedImageUrl && (
                        <img src={selectedImageUrl} alt="Image" className="h-16 w-16 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                        <p className="text-xs text-[var(--ui-text-muted)]">
                            {selectedGifUrl ? 'GIF attached' : 'Image attached'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setSelectedGifUrl(''); setSelectedImageUrl(''); }}
                        className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] transition-colors rounded-md hover:bg-[var(--ui-bg-hover)]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input bar */}
            <div className="flex flex-col bg-[var(--ui-bg-input)] rounded-xl border border-[var(--ui-border)] focus-within:border-[var(--ui-accent)]/40 transition-colors">
                {/* Markdown toolbar */}
                {features.markdown && (
                    <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-0">
                        <button
                            type="button"
                            onClick={() => wrapSelection('**', '**')}
                            className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Bold (Ctrl+B)"
                        >
                            <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => wrapSelection('*', '*')}
                            className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Italic (Ctrl+I)"
                        >
                            <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => wrapSelection('`', '`')}
                            className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Inline code"
                        >
                            <Code className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Main input row */}
                <div className="flex items-end gap-0">
                    {/* Left action buttons */}
                    <div className="flex items-center pl-2 pb-1.5 gap-0.5 shrink-0">
                        {features.emoji && (
                            <EmojiPicker
                                disabled={disabled || sending}
                                onSelect={insertEmoji}
                                align="left"
                            />
                        )}
                        {features.gif && (
                            <GiphyPicker
                                disabled={disabled || sending}
                                onSelect={(gif: GiphyGif) => { setSelectedGifUrl(gif.url); setSelectedImageUrl(''); }}
                                align="left"
                            />
                        )}
                        {features.image && (
                            <>
                                <button
                                    type="button"
                                    disabled={disabled || sending || uploading}
                                    onClick={() => imageInputRef.current?.click()}
                                    className="text-[var(--ui-text-muted)] p-2 rounded-lg hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] disabled:opacity-50 transition-all flex shrink-0 items-center justify-center"
                                    title="Upload image"
                                >
                                    {uploading ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                                    ) : (
                                        <ImageIcon className="w-5 h-5" />
                                    )}
                                </button>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </>
                        )}
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled || sending}
                        rows={1}
                        className="flex-1 bg-transparent text-[var(--ui-text)] text-[15px] placeholder-[var(--ui-text-muted)] py-2.5 px-2 outline-none resize-none min-h-[40px] max-h-[160px] leading-relaxed"
                    />

                    {/* Right side — char count + send */}
                    <div className="flex items-end pb-1.5 pr-2 gap-1 shrink-0">
                        {showCharCount && (
                            <span className={`text-[10px] font-mono self-center mr-1 ${overLimit ? 'text-[var(--ui-danger)]' : 'text-[var(--ui-text-muted)]'}`}>
                                {message.length}/{maxLength}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!canSend || overLimit}
                            className="p-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] disabled:opacity-30 transition-colors rounded-lg hover:bg-[var(--ui-bg-hover)]"
                            title="Send message (Enter)"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Keyboard hint */}
            <div className="flex items-center justify-between px-1 mt-1">
                <p className="text-[9px] text-[var(--ui-text-muted)]">
                    <kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-elevated)] text-[8px] font-mono">Enter</kbd> send · <kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-elevated)] text-[8px] font-mono">Shift+Enter</kbd> new line
                </p>
            </div>
        </div>
    );
}

