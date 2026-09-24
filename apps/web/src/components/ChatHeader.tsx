'use client';

import { useUserPresence } from '@/hooks/usePresence';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, MoreVertical, BadgeCheck, Phone, Video } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
    chatId: string;
    otherUserId: string;
    otherName: string;
    otherImage: string;
    field?: string;
    isVerified?: boolean;
    onAvatarClick?: (e: React.MouseEvent) => void;
    onActionClick?: (e: React.MouseEvent) => void;
    onAudioCall?: () => void;
    onVideoCall?: () => void;
    children?: React.ReactNode;
}

export default function ChatHeader({
    chatId: _chatId,
    otherUserId,
    otherName,
    otherImage,
    field,
    isVerified = true,
    onAvatarClick,
    onActionClick,
    onAudioCall,
    onVideoCall,
    children
}: ChatHeaderProps) {
    const presence = useUserPresence(otherUserId);
    
    let statusText = 'Offline';
    let isOnline = false;

    if (presence) {
        if (presence.state === 'online') {
            statusText = 'Online';
            isOnline = true;
        } else if (presence.last_changed) {
            statusText = `Last seen ${formatDistanceToNow(presence.last_changed, { addSuffix: true })}`;
        }
    }

    return (
        <div
            className="flex items-center justify-between px-3 sm:px-4 py-2.5 backdrop-blur-xl bg-[var(--ui-bg-base)]/70 border-b border-[var(--ui-border)] z-20 shrink-0 sticky top-0 transition-colors shadow-xs"
            style={{ paddingTop: 'max(var(--safe-top, 0px), 10px)' }}
        >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden mr-2">
                {/* Mobile Back Button with spring motion */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="shrink-0"
                >
                    <Link
                        href="/messages"
                        aria-label="Back to conversations"
                        className="p-2 -ml-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-all flex items-center justify-center cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </motion.div>

                {/* Avatar and Name */}
                <motion.div 
                    whileHover={{ scale: 0.99 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none min-w-0 p-1 -ml-1 rounded-2xl hover:bg-[var(--ui-bg-hover)]/40 transition-colors" 
                    onClick={onAvatarClick}
                >
                    {/* Avatar with online status ring and pulsing presence indicator */}
                    <div className="relative shrink-0">
                        <div className={`p-0.5 rounded-full transition-all duration-300 ${
                            isOnline 
                                ? 'ring-2 ring-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                : 'ring-2 ring-transparent'
                        }`}>
                            <img
                                src={otherImage}
                                alt={otherName}
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover bg-[var(--ui-bg-surface)]"
                            />
                        </div>
                        {isOnline ? (
                            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[var(--ui-bg-base)] shadow-xs" />
                            </span>
                        ) : (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-zinc-500 border-2 border-[var(--ui-bg-base)]" />
                        )}
                    </div>

                    {/* Always visible user name with verified / field badge */}
                    <div className="flex flex-col min-w-0 justify-center">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-[var(--ui-text)] text-[15px] sm:text-[16px] leading-tight truncate">
                                {otherName}
                            </span>
                            {isVerified && (
                                <BadgeCheck
                                    className="w-4 h-4 text-[var(--ui-accent)] shrink-0 fill-[var(--ui-accent)]/20"
                                    aria-label="Verified Member"
                                />
                            )}
                            {field && (
                                <span className="hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] border border-[var(--ui-border)]/60">
                                    {field}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                            {isOnline && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                            <span className={`text-[12px] font-medium leading-tight truncate ${
                                isOnline ? 'text-emerald-500 font-semibold' : 'text-[var(--ui-text-muted)]'
                            }`}>
                                {statusText}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Action buttons: audio/video call buttons & more options */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {children}

                {onAudioCall && (
                    <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={onAudioCall}
                        className="p-2 sm:p-2.5 text-[var(--ui-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors cursor-pointer"
                        title="Start Voice Call"
                        aria-label="Start Voice Call"
                    >
                        <Phone className="w-4.5 h-4.5" />
                    </motion.button>
                )}

                {onVideoCall && (
                    <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={onVideoCall}
                        className="p-2 sm:p-2.5 text-[var(--ui-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors cursor-pointer"
                        title="Start Video Call"
                        aria-label="Start Video Call"
                    >
                        <Video className="w-4.5 h-4.5" />
                    </motion.button>
                )}

                <motion.button 
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onActionClick} 
                    className="p-2 sm:p-2.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                    title="Conversation details"
                    aria-label="Conversation details"
                >
                    <MoreVertical className="w-5 h-5" />
                </motion.button>
            </div>
        </div>
    );
}
