'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { useRouter, usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const { userProfile } = useStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user && pathname !== '/login' && pathname !== '/verify-email') {
            router.replace('/login');
        } else if (!loading && user && !userProfile && pathname !== '/setup-profile' && pathname !== '/verify-email') {
            const timer = setTimeout(() => {
                if (!useStore.getState().userProfile) {
                    router.replace('/setup-profile');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, userProfile, loading, pathname, router]);

    if (loading || (user && !userProfile && pathname !== '/setup-profile' && pathname !== '/verify-email')) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--ui-bg-base)] gap-6">
                <div className="animate-[pulse-glow_2s_ease-in-out_infinite]">
                    <h1 className="text-3xl font-bold text-[var(--ui-text)] tracking-tight">
                        <span className="text-[var(--ui-accent)]">✦</span> DYPU Connect
                    </h1>
                </div>
                <LoadingSpinner variant="inline" message="Loading your campus…" />
            </div>
        );
    }

    return <>{children}</>;
}
