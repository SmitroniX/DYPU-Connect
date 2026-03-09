'use client';

import { useUserPresence } from '@/hooks/usePresence';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Phone, MoreVertical } from 'lucide-react';
import Link from 'next/link';

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
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--ui-bg-surface)] border-b border-[var(--ui-border)]/60 z-10 shrink-0 shadow-sm sticky top-0">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                <Link href="/messages" className="p-2 -ml-2 text-[var(--ui-text-muted)] hover:text-[#fafafa] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 cursor-pointer select-none overflow-hidden hover:bg-[var(--ui-bg-hover)]/40 p-1.5 -ml-1.5 rounded-2xl transition-all" onClick={onAvatarClick}>
                    <div className="relative shrink-0">
                        <img src={otherImage} alt={otherName} className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-[var(--ui-bg-surface)]" />
                        {isOnline ? (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[2.5px] border-[var(--ui-bg-surface)] rounded-full"></div>
                        ) : (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-zinc-500 border-[2.5px] border-[var(--ui-bg-surface)] rounded-full"></div>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden hidden sm:flex justify-center">
                        <span className="font-bold text-[#fafafa] text-[16px] leading-tight truncate">
                            {otherName}
                        </span>
                        <span className={`text-[12px] font-medium leading-tight mt-0.5 transition-colors duration-300 truncate ${isOnline ? 'text-emerald-500' : 'text-[#71717a]'}`}>
                            {statusText}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <button className="p-2.5 text-[#a1a1aa] hover:text-[var(--ui-accent)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors hidden sm:flex">
                    <Phone className="w-5 h-5" />
                </button>
                {children}
                <button onClick={onActionClick} className="p-2.5 text-[#a1a1aa] hover:text-[#fafafa] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
