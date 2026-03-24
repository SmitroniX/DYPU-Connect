'use client';

import { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { uploadChatMedia } from '@/lib/storage';
import { compressImage, generateBlurHash } from '@/lib/media';

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
    features: featuresProp = {},
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

    useEffect(() => {
        if (replyToMessage && textareaRef.current) {
            textareaRef.current.focus();      
        }
    }, [replyToMessage]);

    const canSend = !disabled && !sending && !!(message.trim() || selectedGifUrl || selectedImageUrl || selectedAudioUrl);
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
            onStopTyping?.();
        } catch (error) {
            console.error('Failed to send:', error);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
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
        }
    };

    const wrapSelection = (before: string, after: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selection = message.slice(start, end);
        const newText = message.slice(0, start) + before + selection + after + message.slice(end);
        
        setMessage(newText);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
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
            toast.success('Image ready');
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload image');
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
        <div className="px-4 pb-6 shrink-0 relative pt-4">
            <AnimatePresence>
                {typingIndicator && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute -top-6 left-8 h-6 flex items-center bg-[var(--ui-bg-surface)]/80 backdrop-blur-md px-3 rounded-full border border-white/5 text-[10px] font-medium text-[var(--ui-text-secondary)] shadow-sm"
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

            {/* Premium Input Container */}
            <div className="flex flex-col relative z-20 transition-all duration-500">
                
                {/* Floating Markdown Toolbar */}
                <AnimatePresence>
                    {features.markdown && message.length > 0 && (       
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 z-30"
                        >
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl px-1 py-1 shadow-2xl">
                                <MarkdownToolbar onWrapSelection={wrapSelection} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-end gap-3 p-2 rounded-[32px] bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus-within:border-white/20 focus-within:bg-white/[0.06] transition-all duration-500 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] group/input">
                    
                    {/* Integrated Action Bar */}
                    <div className="shrink-0 pl-1 pb-0.5">
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
                    </div>

                    {/* Text Field */}
                    <div className="flex-1 min-w-0 py-2.5">
                        <textarea
                            ref={textareaRef} 
                            value={message}   
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder={replyToMessage ? `Reply to ${replyToMessage.senderName}...` : placeholder}
                            disabled={disabled}
                            maxLength={maxLength}
                            className="w-full bg-transparent text-[16px] leading-[1.5] text-white placeholder-white/30 focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[160px] px-1 scrollbar-hide selection:bg-[var(--ui-accent)]/30"     
                        />
                    </div>

                    {/* Send Control */}
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

            {/* Keyboard hint */}
            <div className="flex items-center justify-center mt-3">
                <p className="text-[10px] text-white/20 font-medium tracking-wide flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5">Enter</span>
                    <span>to send</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5">Shift + Enter</span>
                    <span>for new line</span>
                </p>
            </div>
        </div>
    );
}
