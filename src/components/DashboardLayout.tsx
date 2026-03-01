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
            <div className="flex h-screen bg-[var(--ui-bg-base)] text-[var(--ui-text)]">
                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div
                            className="fixed inset-0 bg-[var(--ui-bg-overlay)]"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <div className="fixed inset-y-0 left-0 z-50 w-[260px] shadow-2xl">
                            <div className="absolute right-2 top-2 z-10">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <Sidebar onNavigate={() => setSidebarOpen(false)} />
                        </div>
                    </div>
                )}

                {/* Desktop sidebar */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[260px] lg:flex-col">
                    <Sidebar />
                </div>

                {/* Main content area */}
                <div className="flex-1 flex flex-col lg:pl-[260px] h-screen overflow-hidden">
                    {/* Mobile header bar */}
                    <div className="lg:hidden flex items-center h-14 bg-[var(--ui-bg-base)] border-b border-[var(--ui-divider)] px-4 shrink-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="ml-3 text-[15px] font-semibold text-[var(--ui-text)]">
                            <span className="text-[var(--ui-accent)]">✦</span> DYPU Connect
                        </span>
                    </div>

                    {/* Page content */}
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
