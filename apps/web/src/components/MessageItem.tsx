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
    
    const ts = msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as { toDate?: () => Date })?.toDate?.();
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
            className={`group relative flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${showMsgHeader ? 'mt-5' : 'mt-1'} transition-all`}
            onContextMenu={(e) => {
                if (window.innerWidth < 1024) {
                    e.preventDefault();
                    handleLongPress();
                }
            }}
        >
            <div className={`flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[75%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar Column */}
                <div className="w-6 sm:w-8 shrink-0 flex flex-col items-center justify-end pb-1">
                    {showMsgHeader && !isMine && (
                        <img
                            src={senderImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`}
                            alt={senderName}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover cursor-pointer shadow-sm ring-1 ring-[var(--ui-border)] hover:ring-[var(--ui-accent)]/50 transition-all"
                            onClick={(e) => onAvatarClick(msg.senderId, e)}
                        />
                    )}
                </div>

                {/* Message bubble container */}
                <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {/* Header row (name) */}
                    {showMsgHeader && !isMine && (
                        <div className="flex items-baseline gap-2 mb-1 ml-1 pl-0.5">
                            <span
                                className="font-bold text-[12px] sm:text-[13px] text-[var(--ui-text)] cursor-pointer hover:underline tracking-tight"
                                onClick={(e) => onAvatarClick(msg.senderId, e)}
                            >
                                {senderName}
                            </span>
                        </div>
                    )}

                    {/* Subtle rounded corners: rounded-2xl rounded-tr-sm for sent, rounded-2xl rounded-tl-sm for received */}
                    <div
                        className={`
                            relative px-3.5 py-2 sm:px-4 sm:py-2.5 flex flex-col min-w-[75px] backdrop-blur-md transition-all active:scale-[0.99]
                            ${isMine 
                                ? 'bg-gradient-to-br from-[var(--ui-accent)] to-[var(--ui-accent)]/95 text-white rounded-2xl rounded-tr-sm border border-[var(--ui-accent)]/30 shadow-md shadow-[var(--ui-accent)]/15' 
                                : 'bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl text-[var(--ui-text)] rounded-2xl rounded-tl-sm border border-[var(--ui-border)] shadow-md shadow-black/5'}
                        `}
                    >
                        {/* Reply snippet inside the bubble */}
                        {msg.replyToId && replyToMsg && (
                            <div className={`mb-2 pl-2.5 border-l-2 rounded-r-lg text-[11px] sm:text-[12px] opacity-90 cursor-pointer transition-opacity hover:opacity-100 ${
                                isMine 
                                    ? 'border-white/80 bg-black/15 p-2' 
                                    : 'border-[var(--ui-accent)] bg-[var(--ui-accent)]/10 p-2'
                            }`}>
                                <div className="font-bold tracking-wide text-[10px] uppercase mb-0.5 opacity-90">
                                    {replyToMsg.senderId === currentUserId ? 'You' : (replyToMsg.senderName || 'User')}
                                </div>
                                <div className="truncate max-w-[180px] sm:max-w-[240px] text-[11px] sm:text-xs">
                                    {replyToMsg.text || 'Attachment'}
                                </div>
                            </div>
                        )}

                        {/* GIF Attachment */}
                        {msg.gifUrl && (
                            <div className="relative max-w-full sm:max-w-[280px] rounded-xl mb-1.5 z-10 overflow-hidden ring-1 ring-black/10">
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

                        {/* Image Attachment */}
                        {msg.imageUrl && (
                            <div className="relative max-w-full sm:max-w-[280px] rounded-xl mb-1.5 z-10 overflow-hidden ring-1 ring-black/10">
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

                        {/* Audio Memo */}
                        {msg.audioUrl && (
                            <div className="mb-1.5">
                                <audio 
                                    src={msg.audioUrl} 
                                    controls 
                                    className={`h-9 sm:h-10 w-full sm:w-52 rounded-lg ${isMine ? 'opacity-95' : 'opacity-100'}`} 
                                />
                            </div>
                        )}

                        {/* Message Text or Edit Input */}
                        {editingMessageId === msg.id ? (
                            <div className="flex flex-col w-full min-w-[200px] mt-1 z-20 relative">
                                <input
                                    autoFocus
                                    className={`bg-transparent border-b ${isMine ? 'border-white/50 text-white placeholder-white/50' : 'border-[var(--ui-border)] text-[var(--ui-text)]'} focus:outline-none pb-1 text-sm`}
                                    value={editValue}
                                    onChange={(e) => setEditValue?.(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveEdit?.(msg.id);
                                        if (e.key === 'Escape') onCancelEdit?.();
                                    }}
                                />
                                <div className={`text-[10px] mt-1.5 font-medium ${isMine ? 'text-white/80' : 'text-[var(--ui-text-muted)]'}`}>
                                    Esc to cancel • Enter to save
                                </div>
                            </div>
                        ) : msg.text && (
                            <div className={`text-[14px] sm:text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                                isMine ? 'text-white' : 'text-[var(--ui-text)]'
                            } ${msg.isDeleted ? 'italic opacity-60' : ''}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: (props) => <span {...props} />,
                                        a: (props) => (
                                            <a 
                                                className={`${isMine ? 'text-white underline font-semibold' : 'text-[var(--ui-accent)] hover:underline font-medium'}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                {...props} 
                                            />
                                        ),
                                        strong: (props) => <strong className="font-bold" {...props} />,
                                        em: (props) => <em className="italic" {...props} />,
                                        code: (props) => (
                                            <code className={`px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] font-mono ${
                                                isMine ? 'bg-white/20 text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-accent)]'
                                            }`} {...props} />
                                        ),
                                        pre: (props) => (
                                            <pre className={`p-2.5 sm:p-3 my-2 rounded-xl ${
                                                isMine ? 'bg-black/30 text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)]'
                                            } overflow-x-auto text-[12px] sm:text-[13px] font-mono border border-[var(--ui-border)]`} {...props} />
                                        ),
                                        blockquote: (props) => (
                                            <blockquote className={`border-l-3 pl-3 my-2 italic ${
                                                isMine ? 'border-white/50 bg-black/15 text-white/90' : 'border-[var(--ui-accent)]/50 bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)]'
                                            } py-1 pr-2 rounded-r-lg`} {...props} />
                                        ),
                                        ul: (props) => <ul className="list-disc pl-4 my-1 space-y-0.5" {...props} />,
                                        ol: (props) => <ol className="list-decimal pl-4 my-1 space-y-0.5" {...props} />,
                                        li: (props) => <li {...props} />
                                    }}
                                >
                                    {filterProfanity(msg.text)}
                                </ReactMarkdown>
                                {msg.isEdited && !msg.isDeleted && (
                                    <span className="text-[10px] ml-1.5 opacity-75 font-medium">(edited)</span>
                                )}
                            </div>
                        )}

                        {/* Timestamp & Delivery Checkmark Indicator (sent/read) */}
                        <div className={`flex items-center gap-1 self-end ml-3 mt-1 text-[10px] font-medium tracking-tight select-none ${
                            isMine ? 'text-white/80' : 'text-[var(--ui-text-muted)]'
                        }`}>
                            <span>{ts ? format(ts, 'HH:mm') : '...'}</span>
                            {isMine && (
                                <span title={isRead ? 'Read' : 'Delivered'} className="inline-flex items-center ml-0.5">
                                    {isRead ? (
                                        /* Double checkmark (read) */
                                        <svg className="w-3.5 h-3.5 text-sky-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12.75 4 4 6.5-9.5" />
                                        </svg>
                                    ) : (
                                        /* Single checkmark (sent / delivered) */
                                        <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Reactions & Hover Toolbar Dock */}
                    <div className={`mt-0.5 flex flex-col ${isMine ? 'items-end' : 'items-start'} ${isMine ? 'pr-1' : 'pl-1'}`}>
                        <MessageReactions
                            reactions={msg.reactions ?? {}}
                            currentUserId={currentUserId}
                            onToggle={(emoji) => onReact(msg.id, emoji)}
                        />
                        {/* Hover Action Dock (Desktop) / Mobile Toggle */}
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
                                        className="fixed inset-0 z-10 lg:hidden" 
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
