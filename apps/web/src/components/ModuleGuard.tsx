'use client';

import { useSystemStore } from '@/store/useSystemStore';
import { PowerOff } from 'lucide-react';
import Link from 'next/link';

interface ModuleGuardProps {
    children: React.ReactNode;
    moduleKey: 'disableConfessions' | 'disableAnonymousChat' | 'disablePublicChat' | 'disableGroups';
    moduleName: string;
}

export default function ModuleGuard({ children, moduleKey, moduleName }: ModuleGuardProps) {
    const { settings, isInitializing } = useSystemStore();

    if (isInitializing) {
        return <div className="p-12 text-center text-[var(--ui-text-muted)] animate-pulse">Loading {moduleName}...</div>;
    }

    if (settings?.[moduleKey]) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-[fade-in-up_0.4s_ease-out]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                    <PowerOff className="h-8 w-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--ui-text)] mb-3">
                    Module Disabled
                </h1>
                <p className="text-[var(--ui-text-muted)] max-w-md mx-auto mb-8">
                    The <strong>{moduleName}</strong> module is currently disabled by administrators. 
                    Please check back later or contact support if you believe this is an error.
                </p>
                <Link 
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--ui-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ui-accent-hover)] transition-all"
                >
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
