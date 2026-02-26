'use client';

import { useAuth } from './AuthProvider';
import { useStore } from '../store/useStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, MessagesSquare, Users, MessageCircle, User, Settings, LogOut, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
    const { logout } = useAuth();
    const { userProfile } = useStore();
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Confessions', href: '/confessions', icon: MessageSquare },
        { name: 'Public Chat', href: '/public-chat', icon: MessagesSquare },
        { name: 'Anonymous Chat', href: '/anonymous-chat', icon: MessageCircle },
        { name: 'Groups', href: '/groups', icon: Users },
        { name: 'Private Chat', href: '/messages', icon: User },
        { name: 'Profile', href: '/profile', icon: User },
        ...(userProfile?.role === 'admin' ? [{ name: 'Admin Dashboard', href: '/admin', icon: ShieldAlert }] : []),
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    DYPU Connect
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
                                            className={clsx(
                                                isActive
                                                    ? 'bg-indigo-50 text-indigo-600'
                                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors duration-200'
                                            )}
                                        >
                                            <item.icon
                                                className={clsx(
                                                    isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                                                    'h-6 w-6 shrink-0 transition-colors duration-200'
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
                            <div className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700">
                                <img
                                    className="h-8 w-8 rounded-full bg-gray-50 border border-indigo-200"
                                    src={userProfile.profileImage}
                                    alt=""
                                />
                                <span className="sr-only">Your profile</span>
                                <span className="truncate flex-1 self-center" aria-hidden="true">
                                    {userProfile.name}
                                </span>
                                <button
                                    onClick={logout}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
