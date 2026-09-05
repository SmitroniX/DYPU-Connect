'use client';

import React, { memo, useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { filterProfanity } from '@/lib/security';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import { Message } from '@/lib/validation/schemas';
import { Blurhash } from 'react-blurhash';

interface MessageItemProps {
    msg: Message;
    isMine: boolean;
    isRead?: boolean;
    showMsgHeader: boolean;
    currentUserId: string;
    replyToMsg?: Message | null;
    editingMessageId?: string | null;
    editValue?: string;
    setEditValue?: (val: string) => void;
    onStartEdit?: (msg: Message) => void;
    onSaveEdit?: (id: string) => void;
    onCancelEdit?: () => void;
    onDelete?: (id: string) => void;
    onReply?: (msg: Message) => void;
    onReact: (id: string, emoji: string) => void;
    onAvatarClick: (userId: string, e: React.MouseEvent) => void;
}

const MessageItem = memo(({
    msg,
    isMine,
    isRead,
    showMsgHeader,
    currentUserId,
    replyToMsg,
    editingMessageId,
    editValue,
    setEditValue,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onReply,
    onReact,
    onAvatarClick
}: MessageItemProps) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
    
    const ts = msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any)?.toDate?.();
    const senderName = msg.senderName || 'User';
    const senderImage = msg.senderImage || '';

    // Long press handler for mobile
    const handleLongPress = () => {
        if (window.innerWidth < 1024) {
            setMobileToolbarOpen(true);
        }
    };

    return (
        <div 
            className={`group relative flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${showMsgHeader ? 'mt-6' : 'mt-1'} animate-[fade-in-up_0.3s_ease-out]`}
            onContextMenu={(e) => {
                if (window.innerWidth < 1024) {
                    e.preventDefault();
                    handleLongPress();
                }
            }}
        >
            <div className={`flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar Column - Narrower on mobile */}
                <div className="w-6 sm:w-8 shrink-0 flex flex-col items-center justify-end pb-1">
                    {showMsgHeader && !isMine && (
                        <img
                            src={senderImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`}
                            alt=""
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover cursor-pointer shadow-sm ring-1 ring-white/5 hover:ring-[var(--ui-accent)]/50 transition-all"
                            onClick={(e) => onAvatarClick(msg.senderId, e)}
                        />
                    )}
                </div>

                {/* Message bubble container */}
                <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {/* Header row (name) */}
                    {showMsgHeader && !isMine && (
                        <div className="flex items-baseline gap-2 mb-1 ml-1 pl-1">
                            <span
                                className="font-semibold text-[12px] sm:text-[13px] text-[var(--ui-text)] cursor-pointer hover:underline"
                                onClick={(e) => onAvatarClick(msg.senderId, e)}
                            >
                                {senderName}
                            </span>
                        </div>
                    )}

                    {/* Actual Bubble */}
                    <div
                        className={`
                            relative px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col min-w-[60px] backdrop-blur-sm transition-transform active:scale-[0.99]
                            ${isMine 
                                ? 'bg-[var(--ui-accent)]/80 backdrop-blur-xl text-white rounded-[22px] rounded-br-[6px] border border-[var(--ui-accent)]/30 shadow-md shadow-[var(--ui-accent)]/10' 
                                : 'bg-[var(--ui-bg-surface)]/80 backdrop-blur-xl text-[var(--ui-text)] rounded-[22px] rounded-bl-[6px] border border-[var(--ui-border)] shadow-md shadow-black/10'}
                        `}
                    >
                        {/* Reply snippet inside the bubble */}
                        {msg.replyToId && replyToMsg && (
                            <div className={`mb-2 pl-2 border-l-[2px] rounded-r-md text-[11px] sm:text-[12px] opacity-85 cursor-pointer transition-opacity hover:opacity-100 ${isMine ? 'border-white/60 bg-[var(--ui-bg-active)] p-1.5' : 'border-[var(--ui-accent)] bg-[var(--ui-accent)]/10 p-1.5'}`}>
                                <div className="font-semibold tracking-wide text-[10px] uppercase mb-0.5">
                                    {replyToMsg.senderId === currentUserId ? 'You' : (replyToMsg.senderName || 'User')}
                                </div>
                                <div className="truncate max-w-[160px] sm:max-w-[200px] text-[11px] sm:text-xs">
                                    {replyToMsg.text || 'Attachment'}
                                </div>
                            </div>
                        )}
                        {msg.gifUrl && (
                            <div className="relative max-w-full sm:max-w-[280px] rounded-[12px] mb-1 z-10 overflow-hidden ring-1 ring-black/10">
                                {msg.blurHash && !imageLoaded && (
                                    <div className="absolute inset-0 z-20">
                                        <Blurhash hash={msg.blurHash} width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
                                    </div>
                                )}
                                <img 
                                    src={msg.gifUrl} 
                                    alt="GIF" 
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
                                    onLoad={() => setImageLoaded(true)}
                                />
                            </div>
                        )}
                        {msg.imageUrl && (
                            <div className="relative max-w-full sm:max-w-[280px] rounded-[12px] mb-1 z-10 overflow-hidden ring-1 ring-black/10">
                                {msg.blurHash && !imageLoaded && (
                                    <div className="absolute inset-0 z-20">
                                        <Blurhash hash={msg.blurHash} width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
                                    </div>
                                )}
                                <img 
                                    src={msg.imageUrl} 
                                    alt="Photo" 
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    onLoad={() => setImageLoaded(true)}
                                />
                            </div>
                        )}
                        {msg.audioUrl && (
                            <div className="mb-1">
                                <audio src={msg.audioUrl} controls className={`h-9 sm:h-10 w-full sm:w-48 rounded-md ${isMine ? 'opacity-90' : 'opacity-100'}`} />
                            </div>
                        )}
                        {editingMessageId === msg.id ? (
                            <div className="flex flex-col w-full min-w-[180px] sm:min-w-[200px] mt-1 z-20 relative">
                                <input
                                    autoFocus
                                    className={`bg-transparent border-b ${isMine ? 'border-white/40 text-white' : 'border-[var(--ui-border)] text-[var(--ui-text)]'} focus:outline-none pb-1 text-sm`}
                                    value={editValue}
                                    onChange={(e) => setEditValue?.(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveEdit?.(msg.id);
                                        if (e.key === 'Escape') onCancelEdit?.();
                                    }}
                                />
                                <div className={`text-[9px] mt-1.5 font-medium ${isMine ? 'text-white/70' : 'text-[var(--ui-text-muted)]'}`}>
                                    Esc to cancel, Enter to save
                                </div>
                            </div>
                        ) : msg.text && (
                            <div className={`text-[14px] sm:text-[15px] leading-[1.4] break-words whitespace-pre-wrap ${isMine ? 'text-white' : 'text-[var(--ui-text)]'} ${msg.text.length < 20 ? 'pr-10' : 'pb-3'} ${msg.isDeleted ? 'italic opacity-60' : ''}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: (props) => <span {...props} />,
                                        a: (props) => <a className={`${isMine ? 'text-white underline font-semibold' : 'text-[var(--ui-accent)] hover:underline'}`} target="_blank" rel="noopener noreferrer" {...props} />,
                                        strong: (props) => <strong className="font-semibold" {...props} />,
                                        em: (props) => <em className="italic" {...props} />,
                                        code: (props) => <code className={`px-1 rounded text-[12px] sm:text-[13px] font-mono ${isMine ? 'bg-white/20 text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-accent)]'}`} {...props} />,
                                        pre: (props) => <pre className={`p-2 sm:p-3 my-2 rounded-lg ${isMine ? 'bg-black/20 text-white/90' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)]'} overflow-x-auto text-[12px] sm:text-[13px] font-mono shadow-inner border border-[var(--ui-border)] scrollbar-hide`} {...props} />,
                                        blockquote: (props) => <blockquote className={`border-l-3 pl-3 my-2 italic ${isMine ? 'border-[var(--ui-border)]0 bg-[var(--ui-bg-active)] text-white/90' : 'border-[var(--ui-accent)]/50 bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)]'} py-1 pr-2 rounded-r`} {...props} />,
                                        ul: (props) => <ul className="list-disc pl-4 my-1" {...props} />,
                                        ol: (props) => <ol className="list-decimal pl-4 my-1" {...props} />,
                                        li: (props) => <li className="mb-0.5" {...props} />
                                    }}
                                >
                                    {filterProfanity(msg.text)}
                                </ReactMarkdown>
                                {msg.isEdited && !msg.isDeleted && <span className="text-[9px] ml-1.5 opacity-70 font-medium">(edited)</span>}
                            </div>
                        )}

                        {/* Timestamp & Read Receipt */}
                        <div className={`absolute bottom-1 right-2 flex items-center gap-0.5 text-[8px] sm:text-[9px] font-medium tracking-wide ${isMine ? 'text-white/80' : 'text-[var(--ui-text-muted)]'}`}>
                            <span>{ts ? format(ts, 'HH:mm') : '...'}</span>
                            {isMine && (
                                <svg className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] ml-0.5 transition-colors ${isRead ? 'text-blue-300' : 'opacity-80'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m18 6-11 11-5-5"></path>
                                    {isRead && <path d="m22 10-7.5 7.5L13 16"></path>}
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Reactions & Toolbar */}
                    <div className={`mt-0.5 flex flex-col ${isMine ? 'items-end' : 'items-start'} ${isMine ? 'pr-1' : 'pl-1'}`}>
                        <MessageReactions
                            reactions={msg.reactions ?? {}}
                            currentUserId={currentUserId}
                            onToggle={(emoji) => onReact(msg.id, emoji)}
                        />
                        {/* Hover Toolbar (Desktop) / Mobile Toggle */}
                        {(!msg.text || msg.text !== 'This message was deleted.') && (
                            <div className={mobileToolbarOpen ? 'block' : 'hidden lg:block'}>
                                <MessageHoverToolbar
                                    onReact={(emoji) => {
                                        onReact(msg.id, emoji);
                                        setMobileToolbarOpen(false);
                                    }}
                                    isMine={isMine}
                                    onEdit={onStartEdit ? () => {
                                        onStartEdit(msg);
                                        setMobileToolbarOpen(false);
                                    } : undefined}
                                    onDelete={onDelete ? () => {
                                        onDelete(msg.id);
                                        setMobileToolbarOpen(false);
                                    } : undefined}
                                    onReply={onReply ? () => {
                                        onReply(msg);
                                        setMobileToolbarOpen(false);
                                    } : undefined}
                                />
                                {mobileToolbarOpen && (
                                    <div 
                                        className="fixed inset-0 z-[-1] lg:hidden" 
                                        onClick={() => setMobileToolbarOpen(false)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
