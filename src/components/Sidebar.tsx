'use client';

import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, MessagesSquare, Users, MessageCircle, User, Mail, Settings, LogOut, ShieldAlert, ChevronRight, Bell } from 'lucide-react';
import clsx from 'clsx';
import NotificationPanel from '@/components/NotificationPanel';

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
        label: 'Chat',
        items: [
            { name: 'Confessions', href: '/confessions', icon: MessageSquare },
            { name: 'Public Chat', href: '/public-chat', icon: MessagesSquare },
            { name: 'Anonymous Chat', href: '/anonymous-chat', icon: MessageCircle },
        ],
    },
    {
        label: 'Connect',
        items: [
            { name: 'Groups', href: '/groups', icon: Users },
            { name: 'Messages', href: '/messages', icon: Mail },
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
    const { userProfile, unreadCount, notificationPanelOpen, setNotificationPanelOpen } = useStore();
    const pathname = usePathname();

    const adminItem = userProfile?.role === 'admin'
        ? { name: 'Admin', href: '/admin', icon: ShieldAlert }
        : null;

    const renderItem = (item: { name: string; href: string; icon: React.ElementType }) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
            <li key={item.name}>
                <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100',
                        isActive
                            ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)]  font-medium'
                            : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)]'
                    )}
                >
                    <item.icon className={clsx('h-[18px] w-[18px] shrink-0', isActive ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text-secondary)]')} />
                    <span className="truncate flex-1">{item.name}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-[var(--ui-accent)] opacity-60" />}
                </Link>
            </li>
        );
    };

    return (
        <div className="flex h-full flex-col bg-[var(--ui-bg-surface)] border-r border-[var(--ui-divider)]">
            {/* App header */}
            <div className="flex h-14 shrink-0 items-center justify-between px-5">
                <h1 className="text-base font-semibold text-[var(--ui-text)] tracking-tight">
                    <span className="text-[var(--ui-accent)]">✦</span> DYPU Connect
                </h1>
                {/* Notification bell */}
                <div className="relative">
                    <button
                        onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                        className="relative p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                        title="Notifications"
                    >
                        <Bell className="h-[18px] w-[18px]" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-[var(--ui-bg-surface)]">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <NotificationPanel />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-1">
                {NAV_SECTIONS.map((section, i) => (
                    <div key={section.label ?? i}>
                        {section.label && (
                            <h3 className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)] select-none">
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

            {/* User panel */}
            {userProfile && (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--ui-divider)]">
                    <div className="relative shrink-0">
                        <img
                            className="h-8 w-8 rounded-full object-cover object-center"
                            src={userProfile.profileImage}
                            alt=""
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--ui-success)] rounded-full ring-2 ring-[var(--ui-bg-surface)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--ui-text)] truncate leading-tight">
                            {userProfile.name}
                        </p>
                        <p className="text-[11px] text-[var(--ui-text-muted)] truncate leading-tight">
                            {userProfile.field}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] rounded-md hover:bg-[var(--ui-bg-hover)] transition-colors"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
