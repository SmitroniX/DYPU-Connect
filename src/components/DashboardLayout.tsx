'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Info, Menu, X, Zap, Bell } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/lib/firebase';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
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
    const { userProfile, currentUser: user } = useStore();

    useEffect(() => {
        if (!db || !user) return;
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
        }, (err) => {
            console.warn('[Announcements] Permission or fetch error:', err);
        });
        return () => unsub();
    }, [userProfile?.field, userProfile?.year, user?.uid, user]);

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

function PushPromptBanner() {
    const { currentUser: user } = useStore();
    const [visible, setVisible] = useState(false);
    
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'default') {
            const dismissed = localStorage.getItem('pushPromptDismissed');
            if (dismissed !== 'true') setVisible(true);
        }
    }, []);

    const handleEnable = async () => {
        if (!user) return;
        const { setupPushNotifications } = await import('@/lib/fcm');
        const success = await setupPushNotifications(user.uid);
        if (success) {
            toast.success('Push notifications enabled!');
        } else {
            toast.error('Failed to enable notifications. Check browser settings.');
        }
        setVisible(false);
        localStorage.setItem('pushPromptDismissed', 'true');
    };

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem('pushPromptDismissed', 'true');
    };

    if (!visible) return null;

    return (
        <div className="shrink-0 space-y-0 relative shadow-sm z-30">
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--ui-accent-dim)] border-b border-[var(--ui-accent-dim)]">
                <Bell className="h-5 w-5 shrink-0 text-[var(--ui-accent)]" />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center">
                    <span className="text-sm font-semibold text-[var(--ui-text)]">Enable Push Notifications</span>
                    <span className="text-[13px] text-[var(--ui-text-muted)] sm:ml-2 truncate hidden sm:block">Stay up to date with messages and mentions.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={handleEnable} 
                        className="px-3 py-1.5 bg-[var(--ui-accent)] text-white font-medium rounded-full text-[13px] hover:brightness-110 transition-all shadow-sm"
                    >
                        Allow
                    </button>
                    <button onClick={handleDismiss} className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-elevated)] rounded-full shrink-0 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
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
    const {
        setNotifications,
        setUnreadMessagesCount,
        setUnreadGroupsCount,
        userProfile
    } = useStore();
    const prevUnreadRef = useRef(0);
    const prevUnreadMsgRef = useRef(0);
    const prevUnreadGroupRef = useRef(0);

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
                    toast.custom((t) => (
                        <div
                            className={`${
                                t.visible ? 'animate-[fade-in-up_0.15s_ease-out]' : 'animate-[fade-out-down_0.15s_ease-in]'
                            } max-w-sm w-full bg-[var(--ui-bg-surface)] shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 border border-[var(--ui-border)]/50 overflow-hidden`}
                        >
                            <div className="flex-1 w-0 p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        {latest.senderImage ? (
                                            <img
                                                className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--ui-accent)]/20"
                                                src={latest.senderImage}
                                                alt=""
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-[var(--ui-accent)]/10 flex items-center justify-center">
                                                <Bell className="h-5 w-5 text-[var(--ui-accent)]" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-semibold text-[var(--ui-text)]">
                                            {latest.title}
                                        </p>
                                        <p className="mt-1 text-sm text-[var(--ui-text-muted)] line-clamp-2">
                                            {latest.body}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-[var(--ui-border)]/50">
                                <button
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        import('@/lib/notifications').then(({ markNotificationRead }) => {
                                             markNotificationRead(user.uid, latest.id).catch(() => {});
                                        });
                                        if (latest.link) {
                                            window.location.href = latest.link;
                                        }
                                    }}
                                    className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-bold text-[var(--ui-accent)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-colors focus:outline-none"
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    ), { duration: 5000 });
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

    // Real-time chat messages listener
    useEffect(() => {
        if (!user?.uid) {
            setUnreadMessagesCount(0);
            return;
        }

        const q = query(
            collection(db, 'private_chats'),
            where('participants', 'array-contains', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            let totalUnread = 0;
            snap.forEach(doc => {
                if (userProfile?.mutedEntities?.includes(doc.id)) return;
                const data = doc.data();
                if (data.unreadCount && data.unreadCount[user.uid]) {
                    totalUnread += data.unreadCount[user.uid];
                }
            });

            if (totalUnread > prevUnreadMsgRef.current && prevUnreadMsgRef.current >= 0) {
                try {
                    const audio = new Audio('/sounds/message.mp3');
                    audio.play().catch(() => {});
                } catch {
                    // ignore
                }
            }

            prevUnreadMsgRef.current = totalUnread;
            setUnreadMessagesCount(totalUnread);
        }, (err) => {
            console.warn('[Chats] Unread count listener error:', err);
        });

        return () => {
             unsub();
             prevUnreadMsgRef.current = 0;
        }
    }, [user?.uid, userProfile?.mutedEntities, setUnreadMessagesCount]);

    // Real-time group messages listener
    useEffect(() => {
        if (!user?.uid) {
            setUnreadGroupsCount(0);
            return;
        }

        const q = query(
            collection(db, 'groups'),
            where('memberIds', 'array-contains', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            let totalUnreadGroups = 0;
            snap.forEach(doc => {
                if (userProfile?.mutedEntities?.includes(doc.id)) return;
                const data = doc.data();
                if (data.unreadCount && data.unreadCount[user.uid]) {
                    totalUnreadGroups += data.unreadCount[user.uid];
                }
            });

            if (totalUnreadGroups > prevUnreadGroupRef.current && prevUnreadGroupRef.current >= 0) {
                try {
                    const audio = new Audio('/sounds/message.mp3');
                    audio.play().catch(() => {});
                } catch {
                     // ignore
                }
            }

            prevUnreadGroupRef.current = totalUnreadGroups;
            setUnreadGroupsCount(totalUnreadGroups);
        }, (err) => {
            console.warn('[Groups] Unread count listener error:', err);
        });

        return () => {
             unsub();
             prevUnreadGroupRef.current = 0;
        }
    }, [user?.uid, userProfile?.mutedEntities, setUnreadGroupsCount]);

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
                        <div className="fixed inset-y-0 left-0 z-50 w-[260px] shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-[var(--ui-bg-base)]">
                            <div className="absolute right-2 top-2 z-10 pt-[env(safe-area-inset-top)]">
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
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[260px] lg:flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                    <Sidebar />
                </div>

                {/* Main content area */}
                <div className="flex-1 flex flex-col lg:pl-[260px] h-screen overflow-hidden pb-[env(safe-area-inset-bottom)]">
                    {/* Mobile header bar */}
                    <div className="lg:hidden flex items-center min-h-[3.5rem] pt-[env(safe-area-inset-top)] bg-[var(--ui-bg-base)] border-b border-[var(--ui-divider)] px-4 shrink-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                            aria-label="Open sidebar navigation"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="ml-3 text-[15px] font-semibold text-[var(--ui-text)]">
                            <span className="text-[var(--ui-accent)]">✦</span> DYPU Connect
                        </span>
                    </div>

                    {/* Announcement banners */}
                    <AnnouncementBanner />
                    
                    {/* Native Push Prompt */}
                    <PushPromptBanner />

                    {/* Page content */}
                    <main className="flex-1 overflow-y-auto" role="main" aria-label="Page content">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
