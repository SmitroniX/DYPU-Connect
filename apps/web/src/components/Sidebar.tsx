'use client';

import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { useSystemStore } from '@/store/useSystemStore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, MessagesSquare, Users, MessageCircle, User, Mail, Settings, LogOut, ShieldAlert, Bell, Search, GraduationCap } from 'lucide-react';
import { cn } from './ui/Button';
import NotificationPanel from '@/components/NotificationPanel';
import { motion } from 'framer-motion';

interface SidebarProps {
    onNavigate?: () => void;
}

const NAV_SECTIONS = [
    {
        label: null,
        items: [
            { name: 'Dashboard', href: '/', icon: Home },
        ],
    },
    {
        label: 'Connect',
        items: [
            { name: 'Public Chat', href: '/public-chat', icon: MessagesSquare },
            { name: 'Groups', href: '/groups', icon: Users },
            { name: 'Messages', href: '/messages', icon: Mail },
        ],
    },
    {
        label: 'Discover',
        items: [
            { name: 'Confessions', href: '/confessions', icon: MessageSquare },
            { name: 'Anonymous Chat', href: '/anonymous-chat', icon: MessageCircle },
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

export default function Sidebar({ onNavigate }: SidebarProps) {
    const { logout } = useAuth();
    const router = useRouter();
    const { userProfile, unreadCount, unreadMessagesCount, unreadGroupsCount, notificationPanelOpen, setNotificationPanelOpen, setSearchModalOpen } = useStore();
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
            <li key={item.name} className="mb-1">
                <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                        'group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]',
                        isActive
                            ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent-text)]'
                            : 'text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)]'
                    )}
                >
                    <div className="flex items-center gap-3 truncate">
                       <item.icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-[var(--ui-accent)]' : 'group-hover:text-[var(--ui-text)]')} />
                       <span className="truncate tracking-wide">{item.name}</span>
                    </div>
                    {badgeCount > 0 && (
                        <span className={cn(
                            'inline-flex items-center justify-center h-5 min-w-[20px] rounded-full px-1.5 text-[10px] font-bold shrink-0 shadow-sm transition-colors',
                            isActive ? 'bg-[var(--ui-accent)] text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)]'
                        )}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                </Link>
            </li>
        );
    };

    return (
        <div className="flex h-full flex-col bg-[var(--ui-bg-surface)] backdrop-blur-xl">
            {/* App header - desktop only */}
            <div className="hidden lg:flex h-20 shrink-0 items-center justify-between px-6 titlebar-drag">
                <Link href="/" className="flex items-center gap-3 outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]">
                   <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[var(--ui-accent)] to-indigo-400 flex items-center justify-center shadow-md shadow-[var(--ui-accent)]/20 text-white">
                      <GraduationCap className="h-5 w-5" />
                   </div>
                   <h1 className="text-lg font-bold text-[var(--ui-text)] tracking-tight no-select">
                       DYPU Connect
                   </h1>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide" role="navigation" aria-label="Main navigation">
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
                    <div key={section.label ?? i} className="mb-6">
                        {section.label && section.items.length > 0 && (
                            <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ui-text-muted)] select-none">
                                {section.label}
                            </h3>
                        )}
                        <ul className="space-y-1">
                            {section.items.map(renderItem)}
                            {section.label === 'Account' && adminItem && renderItem(adminItem)}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User panel */}
            {userProfile && (
                <div className="p-4 mt-auto border-t border-[var(--ui-border)]/50 bg-[var(--ui-bg-base)]/50">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--ui-bg-hover)] transition-colors group cursor-pointer" onClick={() => router.push('/profile')}>
                        <div className="relative shrink-0">
                            <img
                                className="h-10 w-10 rounded-xl object-cover object-center ring-1 ring-[var(--ui-border)] group-hover:ring-[var(--ui-accent)] transition-all"
                                src={userProfile.profileImage || `https://ui-avatars.com/api/?name=${userProfile.name}&background=random`}
                                alt=""
                            />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[var(--ui-success)] rounded-full ring-2 ring-[var(--ui-bg-surface)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--ui-text)] truncate">
                                {userProfile.name}
                            </p>
                            <p className="text-xs text-[var(--ui-text-muted)] truncate">
                                {userProfile.field || 'Student'}
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); logout(); }}
                            className="p-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] rounded-lg hover:bg-[var(--ui-danger)]/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-danger)]"
                            title="Logout"
                            aria-label="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
