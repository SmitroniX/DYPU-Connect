'use client';

import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, MessagesSquare, Users, MessageCircle, User, Mail, Settings, LogOut, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
    onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
    const { logout } = useAuth();
    const { userProfile } = useStore();
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Confessions', href: '/confessions', icon: MessageSquare },
        { name: 'Public Chat', href: '/public-chat', icon: MessagesSquare },
        { name: 'Anonymous Chat', href: '/anonymous-chat', icon: MessageCircle },
        { name: 'Groups', href: '/groups', icon: Users },
        { name: 'Private Chat', href: '/messages', icon: Mail },
        { name: 'Profile', href: '/profile', icon: User },
        ...(userProfile?.role === 'admin' ? [{ name: 'Admin Dashboard', href: '/admin', icon: ShieldAlert }] : []),
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#0a0e1a]/80 backdrop-blur-xl border-r border-white/10 px-5 pb-4">
            <div className="flex h-16 shrink-0 items-center px-1">
                <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-sky-200 to-slate-300 tracking-tight">
                    ✦ DYPU Connect
                </h1>
            </div>
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={clsx(
                                                isActive
                                                    ? 'bg-linear-to-r from-sky-300/15 to-slate-300/10 text-white border border-sky-300/20'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent',
                                                'group relative flex gap-x-3 rounded-xl p-2.5 text-sm leading-6 font-semibold transition-all duration-200'
                                            )}
                                        >
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.5)]" />
                                            )}
                                            <item.icon
                                                className={clsx(
                                                    isActive ? 'text-sky-300' : 'text-slate-500 group-hover:text-white',
                                                    'h-5 w-5 shrink-0 transition-colors duration-200 ml-1'
                                                )}
                                                aria-hidden="true"
                                            />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                    {userProfile && (
                        <li className="mt-auto">
                            <div className="glass flex gap-x-3 p-3 text-sm font-semibold leading-6 text-slate-300">
                                <div className="relative inline-block shrink-0">
                                    <img
                                        className="h-9 w-9 rounded-full border border-sky-300/40 ring-2 ring-sky-300/15 object-cover object-center"
                                        src={userProfile.profileImage}
                                        alt=""
                                    />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-sky-300 rounded-full ring-2 ring-slate-950" />
                                </div>
                                <span className="sr-only">Your profile</span>
                                <span className="truncate flex-1 self-center text-white/90" aria-hidden="true">
                                    {userProfile.name}
                                </span>
                                <button
                                    onClick={logout}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </li>
                    )}
                </ul>
            </nav>
        </div>
    );
}
