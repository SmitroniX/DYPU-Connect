'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldX, Zap } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userProfile, isLoading } = useStore();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [timedOut, setTimedOut] = useState(false);

    // Safety timeout — if loading doesn't resolve in 10s, stop waiting
    useEffect(() => {
        const timer = setTimeout(() => setTimedOut(true), 10_000);
        return () => clearTimeout(timer);
    }, []);

    const stillLoading = (isLoading || authLoading) && !timedOut;

    useEffect(() => {
        if (stillLoading) return;

        // Not logged in at all
        if (!user) {
            router.replace('/login');
            return;
        }

        // Logged in but not admin
        if (userProfile && userProfile.role !== 'admin') {
            router.replace('/');
        }

        // Timed out with no profile — redirect to login
        if (timedOut && !userProfile) {
            router.replace('/login');
        }
    }, [userProfile, stillLoading, user, timedOut, router]);

    /* Still loading user data */
    if (stillLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-[var(--ui-accent)]/20 blur-xl animate-pulse" />
                        <ShieldAlert className="relative w-14 h-14 text-[var(--ui-accent)] animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--ui-text)]">Verifying Admin Access...</h2>
                    <p className="text-sm text-[var(--ui-text-muted)]">Checking authorization credentials</p>
                </div>
            </DashboardLayout>
        );
    }

    /* Profile loaded but not an admin — redirecting */
    if (!userProfile || userProfile.role !== 'admin') {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-[var(--ui-danger)]/20 blur-xl" />
                        <ShieldX className="relative w-14 h-14 text-[var(--ui-danger)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--ui-text)]">Access Denied</h2>
                    <p className="text-sm text-[var(--ui-text-muted)]">Redirecting to dashboard...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Admin Mode Banner */}
            <div className="relative overflow-hidden surface border-red-500/20 p-4 mb-6 w-full mx-auto">
                {/* Background gradient accent */}
                <div className="absolute inset-0 bg-linear-to-r from-red-500/10 via-transparent to-[var(--ui-accent)]/10" />
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-red-500/50 to-transparent" />

                <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-sm" />
                            <div className="relative h-9 w-9 flex items-center justify-center rounded-lg bg-red-500/15 ring-1 ring-red-500/30">
                                <ShieldAlert className="h-4.5 w-4.5 text-red-400" aria-hidden="true" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-300">
                                Admin Mode Active
                            </p>
                            <p className="text-[11px] text-[var(--ui-text-muted)]">
                                Unrestricted access to platform data and controls
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-[var(--ui-accent)]" />
                        <span className="text-xs font-medium text-[var(--ui-text-muted)]">
                            {userProfile.name}
                        </span>
                    </div>
                </div>
            </div>

            {children}
        </DashboardLayout>
    );
}
