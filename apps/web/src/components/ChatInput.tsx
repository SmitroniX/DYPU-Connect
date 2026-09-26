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

interface SlashCommand {
    name: string;
    description: string;
    replacement?: string;
    action?: 'clear' | 'help';
}

const SLASH_COMMANDS: SlashCommand[] = [
    { name: '/shrug', description: '¯\\_(ツ)_/¯', replacement: '¯\\_(ツ)_/¯' },
    { name: '/tableflip', description: '(╯°□°)╯︵ ┻━┻', replacement: '(╯°□°)╯︵ ┻━┻' },
    { name: '/unflip', description: '┬─┬ノ( º _ ºノ)', replacement: '┬─┬ノ( º _ ºノ)' },
    { name: '/clear', description: 'Clear message draft', action: 'clear' },
    { name: '/help', description: 'Commands and shortcuts preview', action: 'help' },
];

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
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [dismissedCommands, setDismissedCommands] = useState(false);
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [selectedBlurHash, setSelectedBlurHash] = useState('');
    const [selectedAudioUrl, setSelectedAudioUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (replyToMessage && textareaRef.current) {
            textareaRef.current.focus();      
        }
    }, [replyToMessage]);

    const canSend = !disabled && !sending && !!(message.trim() || selectedGifUrl || selectedImageUrl || selectedAudioUrl);
    const showCharCount = message.length > maxLength * 0.8;
    const overLimit = message.length > maxLength;

    const isTypingCommand = message.startsWith('/') && !message.includes(' ');
    const cmdQuery = isTypingCommand ? message.toLowerCase() : '';
    const matchingCommands = isTypingCommand
        ? SLASH_COMMANDS.filter(c => c.name.toLowerCase().startsWith(cmdQuery))
        : [];
    const showCommandsPopup = isTypingCommand && !dismissedCommands && matchingCommands.length > 0;

    const showHelpToast = () => {
        toast((_t) => (
            <div className="text-xs space-y-2 p-1 max-w-xs">
                <div>
                    <p className="font-bold text-[13px] text-[var(--ui-text)] mb-1">Slash Commands</p>
                    <div className="space-y-1 font-mono text-[11px] text-[var(--ui-text-secondary)]">
                        <div><span className="text-[var(--ui-accent)] font-semibold">/shrug</span> ➔ ¯\_(ツ)_/¯</div>
                        <div><span className="text-[var(--ui-accent)] font-semibold">/tableflip</span> ➔ (╯°□°)╯︵ ┻━┻</div>
                        <div><span className="text-[var(--ui-accent)] font-semibold">/unflip</span> ➔ ┬─┬ノ( º _ ºノ)</div>
                        <div><span className="text-[var(--ui-accent)] font-semibold">/clear</span> ➔ Clear message draft</div>
                        <div><span className="text-[var(--ui-accent)] font-semibold">/help</span> ➔ Commands & shortcuts guide</div>
                    </div>
                </div>
                <div className="border-t border-[var(--ui-border)] pt-1.5">
                    <p className="font-bold text-[12px] text-[var(--ui-text)] mb-1">Keyboard Shortcuts</p>
                    <div className="space-y-0.5 text-[11px] text-[var(--ui-text-muted)]">
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Enter</kbd> Send message</div>
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Shift+Enter</kbd> New line</div>
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Ctrl/Cmd+B</kbd> Bold text</div>
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Ctrl/Cmd+I</kbd> Italic text</div>
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Ctrl/Cmd+K</kbd> Inline code</div>
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Ctrl/Cmd+Shift+X</kbd> Strikethrough</div>
                        <div><kbd className="px-1 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]">Esc</kbd> Clear reply / dismiss popup</div>
                    </div>
                </div>
            </div>
        ), { duration: 6000, id: 'chat-help' });
    };

    const executeSlashCommand = (cmd: SlashCommand) => {
        setDismissedCommands(true);
        if (cmd.action === 'clear') {
            setMessage('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            onStopTyping?.();
            return;
        }
        if (cmd.action === 'help') {
            setMessage('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            onStopTyping?.();
            showHelpToast();
            return;
        }
        if (cmd.replacement) {
            setMessage(cmd.replacement);
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(cmd.replacement!.length, cmd.replacement!.length);
                }
            });
        }
    };

    const handleSend = async () => {
        const trimmed = message.trim();
        const matchedExact = SLASH_COMMANDS.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
        if (matchedExact) {
            executeSlashCommand(matchedExact);
            return;
        }

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Autocomplete keyboard navigation
        if (showCommandsPopup && matchingCommands.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedCommandIndex(prev => (prev + 1) % matchingCommands.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedCommandIndex(prev => (prev - 1 + matchingCommands.length) % matchingCommands.length);
                return;
            }
            if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                e.preventDefault();
                const selected = matchingCommands[selectedCommandIndex] || matchingCommands[0];
                if (selected) {
                    executeSlashCommand(selected);
                }
                return;
            }
        }

        if (e.key === 'Escape') {
            if (showCommandsPopup && !dismissedCommands) {
                e.preventDefault();
                setDismissedCommands(true);
                return;
            }
            if (replyToMessage) {
                e.preventDefault();
                onCancelReply?.();
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const trimmed = message.trim();
            const matchedExact = SLASH_COMMANDS.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
            if (matchedExact) {
                executeSlashCommand(matchedExact);
                return;
            }
            handleSend();
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            if ((e.key === 'x' || e.key === 'X') && e.shiftKey) {
                e.preventDefault();
                wrapSelection('~~', '~~');
            } else if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                wrapSelection('**', '**');
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                wrapSelection('*', '*');
            } else if (e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                wrapSelection('`', '`');
            }
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMessage(val);
        if (!val.startsWith('/')) {
            setDismissedCommands(false);
        }
        setSelectedCommandIndex(0);
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (features.image) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (features.image && e.dataTransfer.files?.length > 0) {
            handleImageUpload({ target: { files: e.dataTransfer.files } });
        }
    };

    const handleRemoveAttachments = () => {   
        setSelectedGifUrl('');
        setSelectedImageUrl('');
        setSelectedBlurHash('');
        setSelectedAudioUrl('');
    };

    return (
        <div 
            className="px-3 sm:px-4 sm:pb-6 shrink-0 relative pt-2 sm:pt-4 bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent z-30"
            style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <AnimatePresence>
                {typingIndicator && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute -top-4 left-6 sm:-top-6 sm:left-8 h-6 flex items-center bg-[var(--ui-bg-surface)]/80 backdrop-blur-md px-3 rounded-full border border-[var(--ui-border)] text-[10px] font-medium text-[var(--ui-text-secondary)] shadow-sm"
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
            <div className="flex flex-col relative z-20 transition-all duration-500 max-w-5xl mx-auto w-full">
                
                {/* Slash Command Autocomplete Popup */}
                {showCommandsPopup && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                        className="absolute bottom-full mb-3 left-2 sm:left-4 z-40 w-72 sm:w-80 bg-[var(--ui-bg-surface)]/95 backdrop-blur-2xl border border-[var(--ui-border)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] overflow-hidden p-1.5"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider border-b border-[var(--ui-border)]/50 flex items-center justify-between">
                            <span>Commands</span>
                            <span className="text-[10px] font-normal lowercase opacity-70">↑↓ to navigate • ↵ / Tab to apply</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                            {matchingCommands.map((cmd, idx) => {
                                const isSelected = idx === selectedCommandIndex;
                                return (
                                    <button
                                        key={cmd.name}
                                        type="button"
                                        onClick={() => executeSlashCommand(cmd)}
                                        onMouseEnter={() => setSelectedCommandIndex(idx)}
                                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-[var(--ui-accent)] text-white'
                                                : 'text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)]'
                                        }`}
                                    >
                                        <span className="font-mono font-bold">{cmd.name}</span>
                                        <span className={`text-[11px] truncate max-w-[170px] ${
                                            isSelected ? 'text-white/85' : 'text-[var(--ui-text-muted)]'
                                        }`}>
                                            {cmd.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
                
                {/* Floating Markdown Toolbar (Floats gracefully above input when typing) */}
                <AnimatePresence>
                    {features.markdown && message.length > 0 && (       
                        <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 25 }}
                            className="absolute -top-11 right-2 sm:left-1/2 sm:-translate-x-1/2 z-30"
                        >
                            <div className="bg-[var(--ui-bg-surface)]/95 backdrop-blur-2xl border border-[var(--ui-border)] rounded-2xl px-2 py-1 shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
                                <MarkdownToolbar onWrapSelection={wrapSelection} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Drop Zone Overlay */}
                <AnimatePresence>
                    {isDragging && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="absolute inset-0 z-40 bg-[var(--ui-accent)]/20 backdrop-blur-sm border-2 border-dashed border-[var(--ui-accent)] rounded-[28px] flex items-center justify-center pointer-events-none"
                        >
                            <span className="text-[var(--ui-accent)] font-semibold bg-[var(--ui-bg-surface)] px-4 py-2 rounded-full shadow-lg">
                                Drop image to upload
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Glassmorphic Input Capsule */}
                <div className={`flex items-end gap-1.5 sm:gap-2.5 p-1.5 sm:p-2 rounded-[28px] bg-[var(--ui-bg-surface)]/85 hover:bg-[var(--ui-bg-surface)]/95 border border-[var(--ui-border)] focus-within:border-[var(--ui-accent)]/60 focus-within:ring-2 focus-within:ring-[var(--ui-accent)]/20 focus-within:bg-[var(--ui-bg-surface)] transition-all duration-300 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)] group/input ${isDragging ? 'opacity-0' : ''}`}>
                    
                    {/* Action Toggle & Dock */}
                    <div className="shrink-0 self-end p-0.5">
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
                    <div className="flex-1 min-w-0 py-1.5 sm:py-2 px-1 flex flex-col justify-center">
                        <textarea
                            ref={textareaRef} 
                            value={message}   
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder={replyToMessage ? `Reply to ${replyToMessage.senderName}...` : placeholder}
                            disabled={disabled}
                            maxLength={maxLength}
                            rows={1}
                            className="w-full bg-transparent text-[15px] sm:text-[16px] leading-[1.45] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none resize-none overflow-y-auto max-h-[160px] px-1 scrollbar-hide selection:bg-[var(--ui-accent)]/30"     
                        />
                    </div>

                    {/* Send Control */}
                    <div className="shrink-0 self-end p-0.5">
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
            </div>

            {/* Keyboard hint (hidden on mobile) */}
            <div className="hidden sm:flex items-center justify-center mt-3">
                <p className="text-[10px] text-[var(--ui-text-muted)] font-medium tracking-wide flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--ui-bg-hover)] border border-[var(--ui-border)]">Enter</span>
                    <span>to send</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--ui-bg-active)]" />
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--ui-bg-hover)] border border-[var(--ui-border)]">Shift + Enter</span>
                    <span>for new line</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--ui-bg-active)]" />
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--ui-bg-hover)] border border-[var(--ui-border)]">/</span>
                    <span>for commands</span>
                </p>
            </div>
        </div>
    );
}
