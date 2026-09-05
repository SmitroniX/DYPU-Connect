'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';

import { AlertCircle, Info, Menu, X, Zap, Bell, Search, Home, MessageCircle, Users, User } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import NotificationPanel from '@/components/NotificationPanel';
import GlobalSearch from '@/components/GlobalSearch';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/lib/firebase';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { subscribeToNotifications } from '@/lib/notifications';
import { useAuth } from '@/components/AuthProvider';
import toast from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';

interface ActiveAnnouncement {
    id: string;
    title: string;
    body: string;
    priority: 'info' | 'warning' | 'critical';
    targetAudience: string;
}

const PRIORITY_STYLES = {
    info: { bg: 'bg-blue-500/10 border-blue-500/20', icon: Info, iconColor: 'text-blue-600 dark:text-blue-400', text: 'text-blue-800 dark:text-blue-300' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle, iconColor: 'text-amber-600 dark:text-amber-400', text: 'text-amber-800 dark:text-amber-300' },
    critical: { bg: 'bg-red-500/10 border-red-500/20', icon: Zap, iconColor: 'text-red-600 dark:text-red-400', text: 'text-red-800 dark:text-red-300' },
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
        <div className="shrink-0 space-y-0 relative z-[60]">
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
                        <button onClick={() => setDismissed(prev => new Set(prev).add(ann.id))} aria-label="Dismiss announcement" className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] shrink-0">
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
        <div className="shrink-0 space-y-0 relative shadow-sm z-[60]">
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--ui-accent-dim)] border-b border-[var(--ui-accent-dim)]">
                <Bell className="h-5 w-5 shrink-0 text-[var(--ui-accent)]" />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center">
                    <span className="text-sm font-semibold text-[var(--ui-text)]">Enable Push Notifications</span>
                    <span className="text-[13px] text-[var(--ui-text-muted)] sm:ml-2 truncate hidden sm:block">Stay up to date with messages and mentions.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={handleEnable} 
                        className="px-3 py-1.5 bg-[var(--ui-accent)] text-[var(--ui-text)] font-medium rounded-full text-[13px] hover:brightness-110 transition-all shadow-sm"
                    >
                        Allow
                    </button>
                    <button onClick={handleDismiss} aria-label="Dismiss notification prompt" className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-elevated)] rounded-full shrink-0 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MobileBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Messages', href: '/messages', icon: MessageCircle },
        { name: 'Groups', href: '/groups', icon: Users },
        { name: 'Profile', href: '/profile', icon: User },
    ];

    return (
        <nav 
            className="lg:hidden fixed left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-[380px] bg-[var(--ui-bg-base)]/80 backdrop-blur-3xl rounded-[2rem] border border-[var(--ui-border)] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ bottom: 'calc(1.5rem + var(--safe-bottom))' }}
        >
            {/* Subtle top glare */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--ui-border)] to-transparent" />
            
            <div className="flex items-center justify-between h-[72px] px-2 sm:px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link 
                            key={item.name} 
                            href={item.href}
                            className={clsx(
                                "relative flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all duration-300",
                                isActive ? "text-white" : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                            )}
                        >
                            <div className="relative flex items-center justify-center px-5 py-2 rounded-2xl z-10 transition-all duration-300">
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill-mobile"
                                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 -z-10"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <item.icon 
                                    className={clsx(
                                        "w-[22px] h-[22px] transition-transform duration-300 relative z-10",
                                        isActive ? "scale-110 drop-shadow-sm" : ""
                                    )} 
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </div>
                            <span className={clsx(
                                "text-[10px] tracking-widest uppercase transition-all duration-300",
                                isActive ? "font-black" : "font-bold"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { user } = useAuth();
    const isSpecificChat = /^\/(messages|groups)\/[^\/]+$/.test(pathname) || pathname === '/public-chat';
    const {
        setNotifications,
        setUnreadMessagesCount,
        setUnreadGroupsCount,
        userProfile,
        unreadCount,
        notificationPanelOpen,
        setNotificationPanelOpen,
        setSearchModalOpen
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

            if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
                const latest = notifs.find((n) => !n.read);
                if (latest) {
                    toast.custom((t) => (
                        <div
                            className={`${
                                t.visible ? 'animate-[fade-in-up_0.15s_ease-out]' : 'animate-[fade-out-down_0.15s_ease-in]'
                            } max-w-sm w-full bg-[var(--ui-bg-surface)] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 border border-[var(--ui-border)] overflow-hidden`}
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
                            <div className="flex border-l border-[var(--ui-border)]">
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
                                    className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-bold text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10 transition-colors focus:outline-none"
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

    // Unread counts listeners
    useEffect(() => {
        if (!user?.uid) {
            setUnreadMessagesCount(0);
            return;
        }

        const q = query(collection(db, 'private_chats'), where('participants', 'array-contains', user.uid));
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
                new Audio('/sounds/message.mp3').play().catch(() => {});
            }
            prevUnreadMsgRef.current = totalUnread;
            setUnreadMessagesCount(totalUnread);
        });
        return () => unsub();
    }, [user?.uid, userProfile?.mutedEntities, setUnreadMessagesCount]);

    useEffect(() => {
        if (!user?.uid) {
            setUnreadGroupsCount(0);
            return;
        }

        const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', user.uid));
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
                new Audio('/sounds/message.mp3').play().catch(() => {});
            }
            prevUnreadGroupRef.current = totalUnreadGroups;
            setUnreadGroupsCount(totalUnreadGroups);
        });
        return () => unsub();
    }, [user?.uid, userProfile?.mutedEntities, setUnreadGroupsCount]);

    return (
        <ProtectedRoute>
            <div className="flex h-screen-dynamic bg-transparent text-[var(--ui-text)] overflow-hidden">
                
                {/* Desktop sidebar */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[260px] lg:flex-col"
                    style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
                    <Sidebar />
                </div>

                {/* Main content area */}
                <div className="flex-1 flex flex-col lg:pl-[260px] h-full overflow-hidden">
                    {/* Header bar (consistent across platforms) */}
                    <header 
                        className={clsx("items-center justify-between bg-[var(--ui-bg-base)]/50 backdrop-blur-xl border-b border-[var(--ui-border)] px-6 shrink-0 relative z-[70]", isSpecificChat ? 'hidden lg:flex' : 'flex')}
                        style={{ minHeight: 'calc(4.5rem + var(--safe-top))', paddingTop: 'var(--safe-top)' }}
                    >
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 -ml-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] active:scale-95 transition-all"
                                aria-label="Open sidebar"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <span className="text-[var(--ui-text)] text-xs font-black">C</span>
                                </div>
                                <span className="text-[15px] font-bold text-[var(--ui-text)] tracking-tight hidden sm:block">DYPU Connect</span>
                            </div>
                        </div>
                        
<div className="flex items-center gap-2">
                            <ThemeToggle />
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSearchModalOpen(true)}
                                className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-all"
                                aria-label="Search"
                            >
                                <Search className="h-5 w-5" />
                            </motion.button>
                            <div className="relative">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                                    className="relative p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-all"
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--ui-bg-base)]" />
                                    )}
                                </motion.button>
                                <NotificationPanel align="header" />
                            </div>
                        </div>
                    </header>

                    {/* Announcement & Promotion areas */}
                    <AnnouncementBanner />
                    <PushPromptBanner />
                    <GlobalSearch />

                    {/* Content Main */}
                    <main className={clsx(
                        "flex-1 overflow-y-auto w-full relative scrollbar-hide",
                        isSpecificChat ? "pb-0" : "pb-28 lg:pb-0"
                    )}>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>

                {/* Mobile Navigation */}
                {!isSpecificChat && <MobileBottomNav />}

                {/* Drawer Overlay (Mobile Only for Sidebar fallback) */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <div className="fixed inset-0 z-[150] lg:hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setSidebarOpen(false)}
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute inset-y-0 left-0 w-[280px] bg-[var(--ui-bg-base)] shadow-2xl flex flex-col"
                            >
                                <div 
                                    className="flex items-center justify-between px-6 pb-4 border-b border-[var(--ui-border)]"
                                    style={{ paddingTop: 'max(var(--safe-top), 16px)' }}
                                >
                                    <span className="font-bold text-[var(--ui-text)]">Menu</span>
                                    <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="p-2 -mr-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <Sidebar onNavigate={() => setSidebarOpen(false)} />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}
