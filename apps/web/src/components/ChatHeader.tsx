'use client';

import { useUserPresence } from '@/hooks/usePresence';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Phone, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
    chatId: string;
    otherUserId: string;
    otherName: string;
    otherImage: string;
    onAvatarClick?: (e: React.MouseEvent) => void;
    onActionClick?: (e: React.MouseEvent) => void;
    children?: React.ReactNode;
}

export default function ChatHeader({ otherUserId, otherName, otherImage, onAvatarClick, onActionClick, children }: ChatHeaderProps) {
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
        <div className="flex items-center justify-between px-4 pb-3 pt-[max(var(--safe-top),12px)] bg-[var(--ui-bg-surface)]/70 backdrop-blur-3xl border-b border-[var(--ui-border)] z-10 shrink-0 shadow-[0_4px_32px_0_rgba(0,0,0,0.1)] sticky top-0">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Link href="/messages" className="p-2 -ml-2 text-[var(--ui-text-muted)] hover:text-[#fafafa] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors shrink-0 flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </motion.div>
                <motion.div 
                    whileHover={{ scale: 0.98, backgroundColor: 'var(--ui-bg-hover)' }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 cursor-pointer select-none overflow-hidden p-1.5 -ml-1.5 rounded-2xl transition-all" 
                    onClick={onAvatarClick}
                >
                    <div className="relative shrink-0">
                        <img src={otherImage} alt={otherName} className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-[var(--ui-bg-surface)]" />
                        {isOnline ? (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[2.5px] border-[var(--ui-bg-surface)] rounded-full"></div>
                        ) : (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-zinc-500 border-[2.5px] border-[var(--ui-bg-surface)] rounded-full"></div>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden justify-center">
                        <span className="font-bold text-[#fafafa] text-[16px] leading-tight truncate">
                            {otherName}
                        </span>
                        <span className={`text-[12px] font-medium leading-tight mt-0.5 transition-colors duration-300 truncate ${isOnline ? 'text-emerald-500' : 'text-[#71717a]'}`}>
                            {statusText}
                        </span>
                    </div>
                </motion.div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {children}
                <motion.button 
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onActionClick} 
                    className="p-2.5 text-[#a1a1aa] hover:text-[#fafafa] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors"
                >
                    <MoreVertical className="w-5 h-5" />
                </motion.button>
            </div>
        </div>
    );
}
