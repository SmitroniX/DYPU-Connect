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
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--ui-bg-surface)] border-b border-[var(--ui-border)]/50 z-10 shrink-0 shadow-sm backdrop-blur-xl bg-opacity-80 sticky top-0">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                <Link href="/messages" className="p-1.5 -ml-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 cursor-pointer select-none overflow-hidden hover:bg-[var(--ui-bg-hover)]/50 p-1.5 -ml-1.5 rounded-xl transition-colors" onClick={onAvatarClick}>
                    <div className="relative shrink-0">
                        <img src={otherImage} alt={otherName} className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-[var(--ui-border)]" />
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--ui-bg-surface)] rounded-full"></div>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden hidden sm:flex">
                        <span className="font-semibold text-[var(--ui-text)] text-[15px] leading-tight truncate">
                            {otherName}
                        </span>
                        <span className={`text-[12px] leading-tight transition-colors duration-300 truncate ${isOnline ? 'text-green-500 font-medium' : 'text-[var(--ui-text-muted)]'}`}>
                            {statusText}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button className="p-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors hidden sm:flex">
                    <Phone className="w-5 h-5" />
                </button>
                {children}
                <button onClick={onActionClick} className="p-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
