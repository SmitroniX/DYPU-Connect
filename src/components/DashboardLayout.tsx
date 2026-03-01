'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-[#0a0e1a] text-white font-sans">
                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <div className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0e1a]/95 backdrop-blur-xl shadow-2xl border-r border-white/10">
                            <div className="absolute right-2 top-2 z-10">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <Sidebar onNavigate={() => setSidebarOpen(false)} />
                        </div>
                    </div>
                )}

                {/* Sidebar for desktop */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r border-white/5">
                    <Sidebar />
                </div>

                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-40 flex items-center gap-x-4 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/10 px-4 py-4 sm:px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="-m-2 p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex-1 text-sm font-bold leading-6 bg-clip-text text-transparent bg-linear-to-r from-sky-200 to-slate-300">
                        ✦ DYPU Connect
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="py-6 lg:py-8 lg:pl-72 flex-1 w-full relative h-dvh overflow-y-auto">
                    <div className="px-4 sm:px-6 lg:px-8 h-full">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
