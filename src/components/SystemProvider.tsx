'use client';

import { useEffect } from 'react';
import { useSystemStore } from '@/store/useSystemStore';
import { useStore } from '@/store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function SystemProvider({ children }: { children: React.ReactNode }) {
    const { settings, isInitializing, initSystemListener } = useSystemStore();
    const { userProfile, currentUser: user } = useStore();

    useEffect(() => {
        if (!user?.uid) return;
        console.log('[SystemProvider] Starting initSystemListener for:', user.uid);
        const unsubscribe = initSystemListener();
        return () => {
            console.log('[SystemProvider] Unsubscribing system listener');
            if (unsubscribe) unsubscribe();
        };
    }, [initSystemListener, user?.uid]);

    // Don't show maintenance screen while initializing
    if (isInitializing) {
        return <>{children}</>;
    }

    const isAdmin = userProfile?.role === 'admin';

    // If maintenance mode is active, block non-admins
    if (settings?.maintenanceMode && !isAdmin) {
        return (
            <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[var(--ui-bg)] font-sans text-center">
                <div className="max-w-md w-full surface p-8 border-t-4 border-red-500 animate-[fade-in-up_0.4s_ease-out]">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--ui-text)] mb-3">
                        System Maintenance
                    </h1>
                    <p className="text-[var(--ui-text-muted)] leading-relaxed text-sm">
                        {settings.maintenanceMessage || 'The system is currently undergoing scheduled maintenance. Please check back later.'}
                    </p>

                    <div className="mt-8 pt-6 border-t border-[var(--ui-divider)]">
                        <p className="text-xs text-[var(--ui-text-muted)] opacity-60">
                            DYPU Connect Admins are working to restore service.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
