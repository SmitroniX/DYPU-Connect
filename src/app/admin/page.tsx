'use client';

import Link from 'next/link';
import { Users, ShieldAlert, EyeOff, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
    const adminModules = [
        { name: 'User Management', description: 'View specific users, manage roles, and issue bans.', href: '/admin/users', icon: Users, color: 'text-sky-400 bg-sky-500/15' },
        { name: 'Confession Tracking', description: 'View real identities of anonymous confessions.', href: '/admin/confessions', icon: MessageSquare, color: 'text-pink-400 bg-pink-500/15' },
        { name: 'Anonymous Chat Tracking', description: 'Oversee the Shadow Realm with real identities exposed.', href: '/admin/anonymous-chat', icon: EyeOff, color: 'text-purple-400 bg-purple-500/15' },
        { name: 'Moderation Reports', description: 'Review and act on user-submitted reports.', href: '/admin/reports', icon: ShieldAlert, color: 'text-red-400 bg-red-500/15' },
    ];

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.5s_ease-out]">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">🛡️ Admin Control Center</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Monitor platform activity and enforce community guidelines.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {adminModules.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="group relative glass hover:bg-white/10 hover:border-red-500/20 hover:-translate-y-1 transition-all duration-300 p-6 overflow-hidden"
                    >
                        <div className="relative z-10 flex items-start gap-4">
                            <div className={`h-11 w-11 flex items-center justify-center rounded-xl ${item.color} group-hover:scale-110 transition-transform shrink-0`}>
                                <item.icon className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-sm text-slate-400 leading-relaxed mt-1">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
