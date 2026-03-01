'use client';

import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Hash, Home, MessageSquare, MessagesSquare, Users, MessageCircle, User, Mail, Settings, LogOut, ShieldAlert, Mic, Headphones } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
    onNavigate?: () => void;
}

const CHANNELS = [
    { name: 'Dashboard', href: '/', icon: Home, category: null },
];

const CHAT_CHANNELS = [
    { name: 'confessions', href: '/confessions', icon: MessageSquare },
    { name: 'public-chat', href: '/public-chat', icon: MessagesSquare },
    { name: 'anonymous-chat', href: '/anonymous-chat', icon: MessageCircle },
];

const SOCIAL_CHANNELS = [
    { name: 'groups', href: '/groups', icon: Users },
    { name: 'messages', href: '/messages', icon: Mail },
];

const USER_CHANNELS = [
    { name: 'profile', href: '/profile', icon: User },
    { name: 'settings', href: '/settings', icon: Settings },
];

function ChannelCategory({ label }: { label: string }) {
    return (
        <h3 className="px-2 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--dc-text-muted)] select-none">
            {label}
        </h3>
    );
}

export default function Sidebar({ onNavigate }: SidebarProps) {
    const { logout } = useAuth();
    const { userProfile } = useStore();
    const pathname = usePathname();

    const adminChannel = userProfile?.role === 'admin'
        ? [{ name: 'admin', href: '/admin', icon: ShieldAlert }]
        : [];

    const renderChannel = (item: { name: string; href: string; icon: React.ElementType }) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
            <li key={item.name}>
                <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                        'group flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] text-[15px] leading-5 transition-colors duration-100',
                        isActive
                            ? 'bg-[var(--dc-bg-active)] text-[var(--dc-text-primary)] font-medium'
                            : 'text-[var(--dc-text-secondary)] hover:bg-[var(--dc-bg-hover)] hover:text-[var(--dc-text-primary)]'
                    )}
                >
                    {item.href === '/' ? (
                        <item.icon className={clsx('h-5 w-5 shrink-0', isActive ? 'text-[var(--dc-text-primary)]' : 'text-[var(--dc-text-muted)]')} />
                    ) : (
                        <Hash className={clsx('h-4 w-4 shrink-0', isActive ? 'text-[var(--dc-text-primary)]' : 'text-[var(--dc-text-muted)]')} />
                    )}
                    <span className="truncate">{item.name}</span>
                </Link>
            </li>
        );
    };

    return (
        <div className="flex h-full flex-col bg-[var(--dc-bg-secondary)]">
            {/* Server header */}
            <div className="flex h-12 shrink-0 items-center px-4 border-b border-[var(--dc-divider)] shadow-sm">
                <h1 className="text-base font-bold text-[var(--dc-text-primary)] truncate">
                    ✦ DYPU Connect
                </h1>
            </div>

            {/* Channel list */}
            <nav className="flex-1 overflow-y-auto px-2 py-2">
                <ul className="space-y-0.5">
                    {CHANNELS.map(renderChannel)}
                </ul>

                <ChannelCategory label="Chat Channels" />
                <ul className="space-y-0.5">
                    {CHAT_CHANNELS.map(renderChannel)}
                </ul>

                <ChannelCategory label="Social" />
                <ul className="space-y-0.5">
                    {SOCIAL_CHANNELS.map(renderChannel)}
                </ul>

                <ChannelCategory label="You" />
                <ul className="space-y-0.5">
                    {USER_CHANNELS.map(renderChannel)}
                    {adminChannel.map(renderChannel)}
                </ul>
            </nav>

            {/* User panel (Discord-style bottom bar) */}
            {userProfile && (
                <div className="flex items-center gap-2 px-2 py-2 bg-[var(--dc-bg-tertiary)] border-t border-[var(--dc-divider)]">
                    <div className="relative shrink-0">
                        <img
                            className="h-8 w-8 rounded-full object-cover object-center"
                            src={userProfile.profileImage}
                            alt=""
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--dc-online)] rounded-full ring-[3px] ring-[var(--dc-bg-tertiary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--dc-text-primary)] truncate leading-tight">
                            {userProfile.name}
                        </p>
                        <p className="text-[11px] text-[var(--dc-text-muted)] truncate leading-tight">
                            Online
                        </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button className="p-1.5 text-[var(--dc-text-muted)] hover:text-[var(--dc-text-primary)] rounded transition-colors" title="Mute">
                            <Mic className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 text-[var(--dc-text-muted)] hover:text-[var(--dc-text-primary)] rounded transition-colors" title="Deafen">
                            <Headphones className="h-4 w-4" />
                        </button>
                        <button
                            onClick={logout}
                            className="p-1.5 text-[var(--dc-text-muted)] hover:text-[var(--dc-dnd)] rounded transition-colors"
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
