'use client';

import { useUserPresence } from '@/hooks/usePresence';
import clsx from 'clsx';

export default function UserStatus({ userId, className }: { userId: string, className?: string }) {
    const presence = useUserPresence(userId);
    const isOnline = presence?.state === 'online';

    return (
        <span 
            className={clsx(
                "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-[3px] ring-[var(--ui-bg-surface)] group-hover:ring-[var(--ui-bg-hover)] transition-all",
                isOnline ? "bg-emerald-500" : "bg-zinc-500",
                className
            )} 
        />
    );
}
