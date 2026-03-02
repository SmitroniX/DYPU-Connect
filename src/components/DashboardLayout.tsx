'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Info, Menu, X, Zap } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { subscribeToNotifications } from '@/lib/notifications';
import { useAuth } from '@/components/AuthProvider';
import toast from 'react-hot-toast';

interface ActiveAnnouncement {
    id: string;
    title: string;
    body: string;
    priority: 'info' | 'warning' | 'critical';
    targetAudience: string;
}

const PRIORITY_STYLES = {
    info: { bg: 'bg-blue-500/10 border-blue-500/20', icon: Info, iconColor: 'text-blue-400', text: 'text-blue-300' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle, iconColor: 'text-amber-400', text: 'text-amber-300' },
    critical: { bg: 'bg-red-500/10 border-red-500/20', icon: Zap, iconColor: 'text-red-400', text: 'text-red-300' },
};

function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState<ActiveAnnouncement[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const { userProfile } = useStore();

    useEffect(() => {
        if (!db) return;
        const now = new Date();
        const q = query(
            collection(db, 'announcements'),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'asc'),
            limit(5)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ActiveAnnouncement[];
            // Filter by audience
            const filtered = data.filter(a =>
                a.targetAudience === 'all' ||
                a.targetAudience === userProfile?.field ||
                a.targetAudience === userProfile?.year
            );
            setAnnouncements(filtered);
        }, () => {});
        return () => unsub();
    }, [userProfile?.field, userProfile?.year]);

    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="shrink-0 space-y-0">
            {visible.map(ann => {
                const style = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.info;
                const PIcon = style.icon;
                return (
                    <div key={ann.id} className={`flex items-center gap-3 px-4 py-2.5 border-b ${style.bg}`}>
                        <PIcon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
                        <div className="flex-1 min-w-0">
                            <span className={`text-sm font-semibold ${style.text}`}>{ann.title}</span>
                            <span className="text-sm text-[var(--ui-text-muted)] ml-2 truncate">{ann.body}</span>
                        </div>
                        <button onClick={() => setDismissed(prev => new Set(prev).add(ann.id))} className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] shrink-0">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();
    const { setNotifications } = useStore();
    const prevUnreadRef = useRef<number>(0);

    // Real-time notification listener
    useEffect(() => {
        if (!user?.uid) {
            setNotifications([]);
            return;
        }

        const unsub = subscribeToNotifications(user.uid, (notifs) => {
            const newUnread = notifs.filter((n) => !n.read).length;

            // Show toast for NEW unread notifications (only when count increases)
            if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
                const latest = notifs.find((n) => !n.read);
                if (latest) {
                    toast(latest.title, {
                        icon: '🔔',
                        duration: 4000,
                        style: {
                            background: 'var(--ui-bg-elevated)',
                            color: 'var(--ui-text)',
                            border: '1px solid var(--ui-divider)',
                        },
                    });
                }
            }

            prevUnreadRef.current = newUnread;
            setNotifications(notifs);
        });

        return () => {
            unsub();
            prevUnreadRef.current = 0;
        };
    }, [user?.uid, setNotifications]);

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

                    {/* Announcement banners */}
                    <AnnouncementBanner />

                    {/* Page content */}
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
