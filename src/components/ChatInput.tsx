'use client';

import { useRef, useState, Suspense, lazy } from 'react';
import { Bold, Code, Image as ImageIcon, Italic, Send, X } from 'lucide-react';
import type { GiphyGif } from '@/lib/giphy';
import { useStore } from '@/store/useStore';
import { uploadChatMedia } from '@/lib/storage';
import toast from 'react-hot-toast';

// Lazy-load heavy picker components — only loaded when the user opens them
const EmojiPicker = lazy(() => import('@/components/EmojiPicker'));
const GiphyPicker = lazy(() => import('@/components/GiphyPicker'));
const AudioRecorder = lazy(() => import('@/components/AudioRecorder'));

export interface ChatInputPayload {
    text: string;
    gifUrl?: string;
    imageUrl?: string;
    audioUrl?: string;
}

export interface ChatInputFeatures {
    emoji?: boolean;
    gif?: boolean;
    image?: boolean;
    markdown?: boolean;
    voice?: boolean;
}

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
}: ChatInputProps) {
    const features = { ...DEFAULT_FEATURES, ...featuresProp };
    const [message, setMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [selectedAudioUrl, setSelectedAudioUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const { userProfile } = useStore();

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
                audioUrl: selectedAudioUrl || undefined,
            });
            setMessage('');
            setSelectedGifUrl('');
            setSelectedImageUrl('');
            setSelectedAudioUrl('');
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
        onTyping?.(true);
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

        setUploading(true);
        try {
            const url = await uploadChatMedia(file, chatId || 'general');
            setSelectedImageUrl(url);
            toast.success('Image attached!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Image upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const hasAttachment = !!(selectedGifUrl || selectedImageUrl);
    return (
        <div className="px-4 pb-4 shrink-0 relative bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent pt-4">
            {/* Typing indicator slot */}
            {typingIndicator && (
                <div className="absolute -top-6 left-6 h-6 flex items-center">{typingIndicator}</div>
            )}

            {/* Attachment preview */}
            {hasAttachment && (
                <div className="absolute bottom-full left-4 mb-2 rounded-2xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]/50 p-2 flex items-center gap-3 shadow-lg backdrop-blur-md animate-[fade-in-up_0.15s_ease-out] z-10 w-fit max-w-[calc(100%-2rem)]">
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
                             onClick={() => { setSelectedGifUrl(''); setSelectedImageUrl(''); setSelectedAudioUrl(''); }}
                             className="text-[11px] text-[var(--ui-danger)] hover:underline mt-0.5"
                        >
                            Remove attachment
                        </button>
                    </div>
                </div>
            )}

            {/* Input bar - Floating Pill Design */}
            <div className="flex flex-col bg-[#27272a]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[26px] border border-white/5 focus-within:border-[var(--ui-accent)]/40 focus-within:ring-4 focus-within:ring-[var(--ui-accent)]/10 transition-all duration-300 relative z-20 overflow-hidden group">
               
               {/* Animated Gradient Glow on Active */}
               <div className="absolute inset-0 bg-gradient-to-r from-[var(--ui-accent)]/0 via-[var(--ui-accent)]/5 to-[var(--ui-accent)]/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                {/* Markdown toolbar (shown only when multi-line or focused) */}
                {features.markdown && (
                    <div className="flex items-center gap-1 px-3 pt-2 pb-0 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={() => wrapSelection('**', '**')}
                            className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Bold (Ctrl+B)"
                        >
                            <Bold className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => wrapSelection('*', '*')}
                            className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Italic (Ctrl+I)"
                        >
                            <Italic className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => wrapSelection('`', '`')}
                            className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Inline code"
                        >
                            <Code className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Main input row */}
                <div className="flex items-end gap-1 px-2 pb-2 pt-1 relative z-10">
                    {/* Left action buttons */}
                    <div className="flex items-center pb-1 gap-1 shrink-0">
                        {features.emoji && (
                            <Suspense fallback={null}>
                                <EmojiPicker
                                    onSelect={insertEmoji}
                                    trigger={
                                        <button
                                            type="button"
                                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] hover:scale-105 transition-all text-lg leading-none"
                                            title="Add emoji"
                                        >
                                            🙂
                                        </button>
                                    }
                                />
                            </Suspense>
                        )}
                        {features.image && (
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={uploading || disabled}
                                className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-all hover:scale-105 disabled:opacity-50"
                                title="Attach photo"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                        )}
                        {features.gif && (
                            <div className="flex items-center justify-center pt-0.5">
                                <Suspense fallback={null}>
                                    <GiphyPicker
                                        onSelect={(gif: GiphyGif) => setSelectedGifUrl(gif.url)}
                                        disabled={disabled}
                                    />
                                </Suspense>
                            </div>
                        )}
                        {features.voice && (
                            <div className="flex items-center justify-center">
                                <Suspense fallback={null}>
                                    <AudioRecorder
                                        onAudioUploaded={(url) => setSelectedAudioUrl(url)}
                                        disabled={disabled || uploading || sending}
                                    />
                                </Suspense>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            ref={imageInputRef}
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Text area */}
                    <div className="flex-1 min-w-0 flex flex-col justify-end pt-1">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled}
                            maxLength={maxLength}
                            className="w-full bg-transparent text-[15px] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none resize-none overflow-y-auto min-h-[40px] max-h-[160px] py-2 px-1 scrollbar-hide"
                            rows={1}
                        />
                    </div>

                    {/* Right side (Send button + char count) */}
                    <div className="flex flex-col items-center justify-end pb-1 pr-1 shrink-0 gap-1 min-w-[36px]">
                        {showCharCount && (
                            <span className={`text-[10px] w-full text-center ${overLimit ? 'text-[var(--ui-danger)] font-bold' : 'text-[var(--ui-text-muted)]'}`}>
                                {message.length}/{maxLength}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!canSend || overLimit}
                            className="h-[42px] w-[42px] flex items-center justify-center rounded-full bg-gradient-to-br from-[#818cf8] to-[#4f46e5] text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:from-[#3f3f46] disabled:to-[#3f3f46] disabled:text-[#a1a1aa] transition-all shadow-md shadow-[#4f46e5]/25"
                            title="Send message"
                        >
                            <Send className="w-[18px] h-[18px] ml-0.5" />
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

