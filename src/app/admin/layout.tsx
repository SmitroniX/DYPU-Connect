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
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
                    <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">Checking Authorizations...</h2>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm w-full mx-auto overflow-hidden">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <ShieldAlert className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700 font-semibold">
                            Admin Mode Active. You have unrestricted access to platform data.
                        </p>
                    </div>
                </div>
            </div>
            {children}
        </DashboardLayout>
    );
}
