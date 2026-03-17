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
    const ts = msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any)?.toDate?.();
    const senderName = msg.senderName || 'User';
    const senderImage = msg.senderImage || '';

    return (
        <div className={`group relative flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${showMsgHeader ? 'mt-6' : 'mt-1'} animate-[fade-in-up_0.3s_ease-out]`}>
            <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar Column */}
                <div className="w-8 shrink-0 flex flex-col items-center justify-end pb-1">
                    {showMsgHeader && !isMine && (
                        <img
                            src={senderImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover cursor-pointer shadow-sm ring-1 ring-[var(--ui-border)] hover:ring-[var(--ui-accent)]/50 transition-all"
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
                                className="font-semibold text-[13px] text-[var(--ui-text)] cursor-pointer hover:underline"
                                onClick={(e) => onAvatarClick(msg.senderId, e)}
                            >
                                {senderName}
                            </span>
                        </div>
                    )}

                    {/* Actual Bubble */}
                    <div
                        className={`
                            relative px-3.5 py-2.5 flex flex-col min-w-[75px] backdrop-blur-sm
                            ${isMine 
                                ? 'bg-gradient-to-br from-[var(--ui-accent)] to-[#4f46e5] text-white rounded-[20px] rounded-br-[4px] shadow-sm shadow-[var(--ui-accent)]/10' 
                                : 'bg-[#18181b] text-[#fafafa] rounded-[20px] rounded-bl-[4px] border border-[#3f3f46]/40 shadow-sm'}
                        `}
                    >
                        {/* Reply snippet inside the bubble */}
                        {msg.replyToId && replyToMsg && (
                            <div className={`mb-2 pl-2.5 border-l-[3px] rounded-r-md text-[12px] opacity-85 cursor-pointer transition-opacity hover:opacity-100 ${isMine ? 'border-white/60 bg-white/10 p-1.5' : 'border-[var(--ui-accent)] bg-[var(--ui-accent)]/10 p-1.5'}`}>
                                <div className="font-semibold tracking-wide text-[11px] uppercase mb-0.5">
                                    {replyToMsg.senderId === currentUserId ? 'You' : (replyToMsg.senderName || 'User')}
                                </div>
                                <div className="truncate max-w-[200px] text-xs">
                                    {replyToMsg.text || 'Attachment'}
                                </div>
                            </div>
                        )}
                        {msg.gifUrl && (
                            <div className="relative max-w-full sm:max-w-[280px] rounded-[14px] mb-1 z-10 overflow-hidden ring-1 ring-black/10">
                                {msg.blurHash && !imageLoaded && (
                                    <div className="absolute inset-0 z-20">
                                        <Blurhash
                                            hash={msg.blurHash}
                                            width="100%"
                                            height="100%"
                                            resolutionX={32}
                                            resolutionY={32}
                                            punch={1}
                                        />
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
                            <div className="relative max-w-full sm:max-w-[280px] rounded-[14px] mb-1 z-10 overflow-hidden ring-1 ring-black/10">
                                {msg.blurHash && !imageLoaded && (
                                    <div className="absolute inset-0 z-20">
                                        <Blurhash
                                            hash={msg.blurHash}
                                            width="100%"
                                            height="100%"
                                            resolutionX={32}
                                            resolutionY={32}
                                            punch={1}
                                        />
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
                                <audio src={msg.audioUrl} controls className={`h-10 w-full sm:w-48 rounded-md ${isMine ? 'opacity-90' : 'opacity-100'}`} />
                            </div>
                        )}
                        {editingMessageId === msg.id ? (
                            <div className="flex flex-col w-full min-w-[200px] mt-1 z-20 relative">
                                <input
                                    autoFocus
                                    className={`bg-transparent border-b ${isMine ? 'border-white/40 text-white' : 'border-[#3f3f46] text-[#fafafa]'} focus:outline-none pb-1`}
                                    value={editValue}
                                    onChange={(e) => setEditValue?.(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveEdit?.(msg.id);
                                        if (e.key === 'Escape') onCancelEdit?.();
                                    }}
                                />
                                <div className={`text-[10px] mt-1.5 font-medium ${isMine ? 'text-white/70' : 'text-[#71717a]'}`}>
                                    Esc to cancel, Enter to save
                                </div>
                            </div>
                        ) : msg.text && (
                            <div className={`text-[15px] leading-[1.4] break-words whitespace-pre-wrap ${isMine ? 'text-white' : 'text-[#fafafa]'} ${msg.text.length < 20 ? 'pr-12' : 'pb-4'} ${msg.isDeleted ? 'italic opacity-60' : ''}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: (props) => <span {...props} />,
                                        a: (props) => <a className={`${isMine ? 'text-white underline font-semibold' : 'text-[var(--ui-accent)] hover:underline'}`} target="_blank" rel="noopener noreferrer" {...props} />,
                                        strong: (props) => <strong className="font-semibold" {...props} />,
                                        em: (props) => <em className="italic" {...props} />,
                                        code: (props) => <code className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${isMine ? 'bg-white/20 text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-accent)]'}`} {...props} />,
                                        pre: (props) => <pre className={`p-3 my-2 rounded-lg ${isMine ? 'bg-black/20 text-white/90' : 'bg-[#1e1e1e] text-[#d4d4d4]'} overflow-x-auto text-[13px] font-mono shadow-inner border border-white/10 scrollbar-thin`} {...props} />,
                                        blockquote: (props) => <blockquote className={`border-l-4 pl-3 my-2 italic ${isMine ? 'border-white/50 bg-white/10 text-white/90' : 'border-[var(--ui-accent)]/50 bg-[var(--ui-bg-elevated)]/50 text-[var(--ui-text-muted)]'} py-1 pr-2 rounded-r`} {...props} />,
                                        ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
                                        ol: (props) => <ol className="list-decimal pl-5 my-2" {...props} />,
                                        li: (props) => <li className="mb-1" {...props} />
                                    }}
                                >
                                    {filterProfanity(msg.text)}
                                </ReactMarkdown>
                                {msg.isEdited && !msg.isDeleted && <span className="text-[10px] ml-1.5 opacity-70 font-medium">(edited)</span>}
                            </div>
                        )}

                        {/* Timestamp & Read Receipt */}
                        <div className={`absolute bottom-1.5 right-2.5 flex items-center gap-0.5 text-[9px] font-medium tracking-wide ${isMine ? 'text-white/80' : 'text-[#71717a]'}`}>
                            <span>{ts ? format(ts, 'HH:mm') : '...'}</span>
                            {isMine && (
                                <svg className="w-[14px] h-[14px] ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m18 6-11 11-5-5"></path>
                                    <path d="m22 10-7.5 7.5L13 16"></path>
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Reactions underneath the bubble directly */}
                    <div className={`mt-0.5 ${isMine ? 'pr-1' : 'pl-1'}`}>
                        <MessageReactions
                            reactions={msg.reactions ?? {}}
                            currentUserId={currentUserId}
                            onToggle={(emoji) => onReact(msg.id, emoji)}
                        />
                        {/* Hover Toolbar for reactions, edit, delete, etc */}
                        {(!msg.text || msg.text !== 'This message was deleted.') && (
                            <MessageHoverToolbar
                                onReact={(emoji) => onReact(msg.id, emoji)}
                                isMine={isMine}
                                onEdit={onStartEdit ? () => onStartEdit(msg) : undefined}
                                onDelete={onDelete ? () => onDelete(msg.id) : undefined}
                                onReply={onReply ? () => onReply(msg) : undefined}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
