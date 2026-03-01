'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import {
    Activity,
    EyeOff,
    MessageSquare,
    RefreshCw,
    ShieldAlert,
    TrendingUp,
    UserX,
    Users,
} from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    bannedUsers: number;
    totalConfessions: number;
    totalAnonMessages: number;
}

interface RecentActivity {
    id: string;
    type: 'confession' | 'anon_message';
    text: string;
    identity: string;
    timestamp: Date | null;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, bannedUsers: 0, totalConfessions: 0, totalAnonMessages: 0 });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
            cacheInvalidate('admin_dashboard');
        } else {
            setLoading(true);
        }

        try {
            const { stats: fetchedStats, activities } = await cacheGet(
                'admin_dashboard',
                async () => {
                    // Fetch counts using getCountFromServer for efficiency
                    const [usersCount, bannedCount, confessionsCount, anonCount] = await Promise.all([
                        getCountFromServer(collection(db, 'users')),
                        getCountFromServer(query(collection(db, 'users'), where('status', '==', 'banned'))),
                        getCountFromServer(collection(db, 'confessions_public')),
                        getCountFromServer(collection(db, 'anonymous_public_chat_private')),
                    ]);

                    const fetchedStats: DashboardStats = {
                        totalUsers: usersCount.data().count,
                        bannedUsers: bannedCount.data().count,
                        totalConfessions: confessionsCount.data().count,
                        totalAnonMessages: anonCount.data().count,
                    };

                    // Fetch recent activity
                    const [confessionLogs, anonLogs] = await Promise.all([
                        getDocs(query(collection(db, 'confessions_private'), orderBy('createdAt', 'desc'), limit(5))),
                        getDocs(query(collection(db, 'anonymous_public_chat_private'), orderBy('timestamp', 'desc'), limit(5))),
                    ]);

                    const activities: RecentActivity[] = [];

                    confessionLogs.docs.forEach(doc => {
                        const data = doc.data();
                        const ts = data.createdAt as Timestamp | null;
                        activities.push({
                            id: doc.id,
                            type: 'confession',
                            text: data.anonymousName || 'Anonymous confession',
                            identity: data.email || data.realName || 'Unknown',
                            timestamp: ts?.toDate?.() ?? null,
                        });
                    });

                    anonLogs.docs.forEach(doc => {
                        const data = doc.data();
                        const ts = data.timestamp as Timestamp | null;
                        activities.push({
                            id: doc.id,
                            type: 'anon_message',
                            text: data.text ? (data.text.length > 60 ? data.text.slice(0, 60) + '…' : data.text) : '[GIF]',
                            identity: data.email || 'Unknown',
                            timestamp: ts?.toDate?.() ?? null,
                        });
                    });

                    // Sort by timestamp descending and take top 8
                    activities.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));

                    return { stats: fetchedStats, activities: activities.slice(0, 8) };
                },
                { ttl: 30_000, swr: 120_000 }
            );

            setStats(fetchedStats);
            setRecentActivity(activities);

        } catch (error) {
            console.error('Admin dashboard fetch error:', error);
            toast.error('Failed to load dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-sky-500/20 to-cyan-500/20', iconColor: 'text-sky-400', ringColor: 'ring-sky-500/20' },
        { label: 'Banned Users', value: stats.bannedUsers, icon: UserX, color: 'from-red-500/20 to-slate-500/20', iconColor: 'text-red-400', ringColor: 'ring-red-500/20' },
        { label: 'Confessions', value: stats.totalConfessions, icon: MessageSquare, color: 'from-sky-300/20 to-slate-400/20', iconColor: 'text-sky-300', ringColor: 'ring-sky-300/20' },
        { label: 'Anon Messages', value: stats.totalAnonMessages, icon: EyeOff, color: 'from-slate-400/20 to-sky-400/20', iconColor: 'text-sky-200', ringColor: 'ring-sky-200/20' },
    ];

    const adminModules = [
        { name: 'User Management', description: 'View users, manage roles, and issue bans.', href: '/admin/users', icon: Users, accent: 'sky', color: 'text-sky-400 bg-sky-500/15', borderHover: 'hover:border-sky-500/30', shadowHover: 'hover:shadow-sky-500/5' },
        { name: 'Confession Tracker', description: 'Real identities behind anonymous confessions.', href: '/admin/confessions', icon: MessageSquare, accent: 'sky', color: 'text-sky-300 bg-sky-300/15', borderHover: 'hover:border-sky-300/30', shadowHover: 'hover:shadow-sky-300/5' },
        { name: 'Shadow Realm Oversight', description: 'Monitor anonymous chat with real email addresses.', href: '/admin/anonymous-chat', icon: EyeOff, accent: 'sky', color: 'text-sky-300 bg-sky-400/15', borderHover: 'hover:border-sky-300/30', shadowHover: 'hover:shadow-sky-300/5' },
        { name: 'Moderation Reports', description: 'Review and act on user-submitted reports.', href: '/admin/reports', icon: ShieldAlert, accent: 'red', color: 'text-red-400 bg-red-500/15', borderHover: 'hover:border-red-500/30', shadowHover: 'hover:shadow-red-500/5' },
    ];

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-red-500/20 to-sky-400/20 ring-1 ring-red-500/20">
                            <ShieldAlert className="h-5 w-5 text-red-400" />
                        </span>
                        Admin Control Center
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Monitor platform activity and enforce community guidelines.
                    </p>
                </div>
                <button
                    onClick={() => fetchDashboardData(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-all duration-200"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                    <div key={stat.label} className="glass p-5 transition-all duration-300 hover:border-white/15">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${stat.color} ring-1 ${stat.ringColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                            </div>
                            <TrendingUp className="h-4 w-4 text-slate-600" />
                        </div>
                        {loading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-16 rounded-lg bg-white/5 animate-pulse" />
                                <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                            </div>
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Admin Modules */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-slate-400" />
                    Admin Modules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminModules.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group relative glass ${item.borderHover} hover:bg-white/[0.07] hover:-translate-y-0.5 ${item.shadowHover} hover:shadow-lg transition-all duration-300 p-5 overflow-hidden`}
                        >
                            <div className="relative z-10 flex items-start gap-4">
                                <div className={`h-11 w-11 flex items-center justify-center rounded-xl ${item.color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                                    <item.icon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white group-hover:text-white/90 transition-colors">
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

            {/* Recent Activity Feed */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-slate-400" />
                    Recent Activity
                </h2>
                <div className="glass overflow-hidden divide-y divide-white/5">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-10 w-10 rounded-full border-2 border-sky-300/30 border-t-sky-300 animate-spin" />
                                <p className="text-sm text-slate-500">Loading activity...</p>
                            </div>
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="p-12 text-center">
                            <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">No recent activity found</p>
                            <p className="text-xs text-slate-500 mt-1">Activity will appear here as users interact with the platform</p>
                        </div>
                    ) : (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    activity.type === 'confession'
                                        ? 'bg-sky-300/15 ring-1 ring-sky-300/20'
                                        : 'bg-sky-400/15 ring-1 ring-sky-300/20'
                                }`}>
                                    {activity.type === 'confession'
                                        ? <MessageSquare className="h-4 w-4 text-sky-300" />
                                        : <EyeOff className="h-4 w-4 text-sky-300" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{activity.text}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                        <span className="text-red-400/80 font-medium">{activity.identity}</span>
                                        {activity.type === 'confession' ? ' · Confession' : ' · Anon Message'}
                                    </p>
                                </div>
                                <p className="text-[11px] text-slate-500 shrink-0">
                                    {activity.timestamp
                                        ? formatDistanceToNow(activity.timestamp, { addSuffix: true })
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
