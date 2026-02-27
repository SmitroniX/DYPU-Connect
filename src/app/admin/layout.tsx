'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userProfile, isLoading } = useStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && userProfile && userProfile.role !== 'admin') {
            router.replace('/');
        }
    }, [userProfile, isLoading, router]);

    if (isLoading || !userProfile || userProfile.role !== 'admin') {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
                    <ShieldAlert className="w-12 h-12 text-red-400 animate-pulse" />
                    <h2 className="text-xl font-bold text-white">Checking Authorizations...</h2>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="glass border-red-500/20 bg-red-500/5 p-4 mb-6 w-full mx-auto overflow-hidden">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-red-300 font-semibold">
                        Admin Mode Active. You have unrestricted access to platform data.
                    </p>
                </div>
            </div>
            {children}
        </DashboardLayout>
    );
}
