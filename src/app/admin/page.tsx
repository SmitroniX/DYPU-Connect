'use client';

import Link from 'next/link';
import { Users, ShieldAlert, EyeOff, MessageSquare, Briefcase } from 'lucide-react';

export default function AdminDashboard() {
    const adminModules = [
        {
            name: 'User Management',
            description: 'View specific users, manage roles, and issue bans.',
            href: '/admin/users',
            icon: Users,
        },
        {
            name: 'Confession Tracking',
            description: 'View real identities of anonymous confessions.',
            href: '/admin/confessions',
            icon: MessageSquare,
        },
        {
            name: 'Anonymous Chat Tracking',
            description: 'Oversee the Shadow Realm with real identities exposed.',
            href: '/admin/anonymous-chat',
            icon: EyeOff,
        },
        {
            name: 'Moderation Reports',
            description: 'Review and act on user-submitted reports.',
            href: '/admin/reports',
            icon: ShieldAlert,
        }
    ];

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans truncate">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Control Center</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Monitor platform activity and enforce community guidelines.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminModules.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="group relative flex flex-col items-start justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-red-200 transition-all overflow-hidden"
                    >
                        <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-red-50 transition-transform group-hover:scale-150 opacity-50 z-0"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-x-4 mb-4">
                                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                    <item.icon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                                    {item.name}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
                                {item.description}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
