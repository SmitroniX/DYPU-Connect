'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useStore } from '../store/useStore';
import { useRouter, usePathname } from 'next/navigation';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const { userProfile, isLoading } = useStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user && pathname !== '/login' && pathname !== '/verify-email') {
            router.replace('/login');
        } else if (!loading && user && !userProfile && pathname !== '/setup-profile' && pathname !== '/verify-email') {
            // Allow a tiny delay for profile document fetch in AuthProvider 
            // but if we are confident it's missing, go to setup:
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}
