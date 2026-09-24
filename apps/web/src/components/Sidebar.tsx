'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useSystemStore } from '@/store/useSystemStore';
import { useAuth } from '@/components/AuthProvider';
import {
    MessageSquare,
    MessageCircle,
    Users,
    User,
    Settings,
    LogOut,
    Bell,
    Search,
    ShieldAlert,
    Sparkles,
    LayoutDashboard
} from 'lucide-react';
import clsx from 'clsx';
import NotificationPanel from './NotificationPanel';

const NAV_SECTIONS = [
    {
        label: 'Dashboard',
        items: [{ name: 'Overview', href: '/', icon: LayoutDashboard }],
    },
    {
        label: 'Spaces',
        items: [
            { name: 'Confessions', href: '/confessions', icon: MessageSquare },
            { name: 'Public Chat', href: '/public-chat', icon: MessageCircle },
            { name: 'Anonymous Chat', href: '/anonymous-chat', icon: ShieldAlert }, // Reusing an icon for anon, or we can use another
        ],
    },
    {
        label: 'Connect',
        items: [
            { name: 'Messages', href: '/messages', icon: MessageSquare },
            { name: 'Groups', href: '/groups', icon: Users },
        ],
    },
    {
        label: 'Account',
        items: [
            { name: 'Profile', href: '/profile', icon: User },
            { name: 'Settings', href: '/settings', icon: Settings },
        ],
    },
];

interface SidebarProps {
    onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
    const { logout } = useAuth();
    const { 
        userProfile, 
        unreadCount, 
        unreadMessagesCount, 
        unreadGroupsCount,
        notificationPanelOpen,
        setNotificationPanelOpen,
        setSearchModalOpen
    } = useStore();
    const { settings } = useSystemStore();
    const pathname = usePathname();

    const adminItem = ['admin', 'moderator'].includes(userProfile?.role || '')
        ? { name: 'Admin', href: '/admin', icon: ShieldAlert }
        : null;

    const renderItem = (item: { name: string; href: string; icon: React.ElementType }) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        let badgeCount = 0;
        if (item.name === 'Messages') badgeCount = unreadMessagesCount;
        if (item.name === 'Groups') badgeCount = unreadGroupsCount;
        
        return (
            <li key={item.name} className="px-3 py-0.5">
                <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden',
                        isActive
                            ? 'text-white shadow-md'
                            : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)]'
                    )}
                >
                    {isActive && (
                        <>
                            <motion.div
                                layoutId="sidebar-active-pill"
                                className="absolute inset-0 bg-gradient-to-r from-[var(--ui-accent)] to-blue-600 rounded-xl shadow-[0_4px_16px_var(--ui-accent-dim),inset_0_1px_1px_rgba(255,255,255,0.35)]"
                                initial={false}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--ui-accent)] to-blue-600 rounded-xl blur-sm opacity-25 -z-10 pointer-events-none" />
                        </>
                    )}
                    <item.icon 
                        className={clsx(
                            'relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110 group-active:scale-95', 
                            isActive ? 'text-white drop-shadow-sm' : 'text-[var(--ui-text-muted)] group-hover:text-[var(--ui-accent)]'
                        )} 
                    />
                    <span className={clsx(
                        'relative z-10 truncate flex-1 tracking-tight transition-colors duration-200',
                        isActive ? 'text-white font-semibold' : 'group-hover:text-[var(--ui-text)]'
                    )}>
                        {item.name}
                    </span>
                    
                    {badgeCount > 0 && (
                        <span className={clsx(
                            'relative z-10 inline-flex items-center justify-center h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold shrink-0 shadow-sm transition-all badge-bounce',
                            isActive ? 'bg-white/25 text-white backdrop-blur-md border border-white/20' : 'bg-[var(--ui-accent)] text-white shadow-sm shadow-[var(--ui-accent-dim)]'
                        )}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                    {isActive && badgeCount === 0 && (
                        <div className="relative z-10 h-1.5 w-1.5 rounded-full bg-white opacity-70 shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                    )}
                </Link>
            </li>
        );
    };

    return (
        <div className="flex h-full flex-col bg-[var(--ui-bg-base)]/80 backdrop-blur-3xl border-r border-[var(--ui-border)] shadow-2xl">
            {/* App header */}
            <div className="flex h-16 shrink-0 items-center justify-between px-6 titlebar-drag">
                <Link href="/" className="flex items-center gap-2.5 group no-select">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-300">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <h1 className="text-[17px] font-extrabold text-[var(--ui-text)] tracking-tight">
                        DYPU<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Connect</span>
                    </h1>
                </Link>
                {/* Actions (Desktop Only) */}
                <div className="relative hidden lg:flex items-center gap-2 titlebar-no-drag">
                    <button
                        onClick={() => setSearchModalOpen(true)}
                        className="p-2 rounded-xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:border-[var(--ui-accent)]/30 hover:bg-[var(--ui-bg-elevated)] transition-all shadow-sm group"
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                            className={clsx(
                                "relative p-2 rounded-xl border transition-all shadow-sm group",
                                notificationPanelOpen 
                                    ? "bg-[var(--ui-bg-elevated)] border-[var(--ui-accent)]/50 text-[var(--ui-text)]" 
                                    : "bg-[var(--ui-bg-surface)] border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:border-[var(--ui-accent)]/30 hover:bg-[var(--ui-bg-elevated)]"
                            )}
                            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                        >
                            <Bell className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px]">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                                    <span className="relative inline-flex items-center justify-center h-4.5 min-w-[18px] rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-[var(--ui-bg-base)] shadow-sm">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                </span>
                            )}
                        </button>
                        <NotificationPanel align="sidebar" />
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar" role="navigation" aria-label="Main navigation">
                {NAV_SECTIONS.map((section) => ({
                    ...section,
                    items: section.items.filter(item => {
                        if (item.name === 'Confessions' && settings?.disableConfessions) return false;
                        if (item.name === 'Public Chat' && settings?.disablePublicChat) return false;
                        if (item.name === 'Anonymous Chat' && settings?.disableAnonymousChat) return false;
                        if (item.name === 'Groups' && settings?.disableGroups) return false;
                        return true;
                    })
                })).filter(section => section.items.length > 0 || section.label === 'Account').map((section, i) => (
                    <div key={section.label ?? i} className="mb-6 last:mb-0">
                        {section.label && section.items.length > 0 && (
                            <h3 className="px-6 mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--ui-text-muted)]/70 select-none">
                                {section.label}
                            </h3>
                        )}
                        <ul className="space-y-0.5">
                            {section.items.map(renderItem)}
                            {section.label === 'Account' && adminItem && renderItem(adminItem)}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User footer card */}
            {userProfile && (
                <div className="p-3.5 mt-auto">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--ui-bg-surface)]/75 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-[var(--ui-accent)]/30 transition-all duration-300">
                        <div className="relative shrink-0">
                            <img
                                className="h-9 w-9 rounded-xl object-cover object-center ring-1 ring-white/20 dark:ring-white/10 shadow-sm"
                                src={userProfile.profileImage}
                                alt={userProfile.name || 'User avatar'}
                            />
                            {/* Online presence green dot with pulsing halo */}
                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-[var(--ui-bg-surface)] dark:ring-zinc-900 shadow-sm" />
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[var(--ui-text)] truncate tracking-tight">
                                {userProfile.name.split(' ')[0]}
                            </p>
                            <p className="text-[11px] font-medium text-[var(--ui-text-muted)] truncate">
                                {userProfile.field || 'Student'}
                            </p>
                        </div>
                        <div className="relative group/logout shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={logout}
                                className="p-2 text-[var(--ui-text-muted)] hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 rounded-xl transition-all duration-200 focus:outline-none"
                                aria-label="Log out"
                            >
                                <LogOut className="h-4 w-4 transition-transform group-hover/logout:translate-x-0.5" />
                            </motion.button>
                            {/* Sleek Tooltip */}
                            <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover/logout:flex items-center px-2 py-1 text-[11px] font-semibold text-white bg-zinc-900/90 dark:bg-zinc-800/95 backdrop-blur-md rounded-lg shadow-xl border border-white/10 whitespace-nowrap z-50">
                                Log out
                                <span className="absolute top-full right-3 border-4 border-transparent border-t-zinc-900/90 dark:border-t-zinc-800/95" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
