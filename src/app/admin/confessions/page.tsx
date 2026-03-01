'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { AlertTriangle, Eye, Search } from 'lucide-react';
import { cacheGet } from '@/lib/cache';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface PrivateConfession {
    id: string;
    confessionId: string;
    userId: string;
    email: string;
    realName: string;
    anonymousName: string;
    createdAt: Timestamp | null;
    text?: string;
}

export default function AdminConfessionsPage() {
    const [logs, setLogs] = useState<(PrivateConfession & { text: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const combined = await cacheGet<(PrivateConfession & { text: string })[]>(
                'admin_confessions',
                async () => {
                    const q = query(collection(db, 'confessions_private'), orderBy('createdAt', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    const privateData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrivateConfession[];

                    const pubQ = query(collection(db, 'confessions_public'), limit(500));
                    const pubSnapshot = await getDocs(pubQ);
                    const publicDataMap = pubSnapshot.docs.reduce((acc, doc) => {
                        acc[doc.id] = doc.data().text;
                        return acc;
                    }, {} as Record<string, string>);

                    return privateData.map(log => ({
                        ...log,
                        text: publicDataMap[log.confessionId] || '[Deleted or Not Found]'
                    }));
                },
                { ttl: 60_000, swr: 300_000 }
            );
            setLogs(combined);
        } catch (error) {
            console.error('error fetching logs', error);
            toast.error('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return log.realName?.toLowerCase().includes(q) ||
            log.email?.toLowerCase().includes(q) ||
            log.anonymousName?.toLowerCase().includes(q) ||
            log.text?.toLowerCase().includes(q);
    });

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="mb-6 glass border-sky-300/20 bg-sky-300/5 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-300/15 ring-1 ring-sky-300/20 shrink-0">
                    <Eye className="h-5 w-5 text-sky-300" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Confession Tracker</h1>
                        {!loading && (
                            <span className="inline-flex items-center rounded-full bg-sky-300/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-300/20">
                                {filteredLogs.length} records
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-sky-200/70 mt-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Highly sensitive. Real identities associated with anonymous confessions are exposed.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="glass p-4 mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all"
                        placeholder="Search by name, email, alias, or confession text..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-sky-300/30 border-t-sky-300 animate-spin" />
                        <p className="text-sm text-slate-500">Loading tracking logs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Real Identity</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Anonymous Alias</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Confession Content</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-sky-300/5 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-sm font-bold text-red-400">{log.realName}</p>
                                            <p className="text-xs text-slate-500">{log.email}</p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-lg bg-white/5 px-2.5 py-1 text-sm text-slate-300 font-mono ring-1 ring-white/10">
                                                {log.anonymousName}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-400 max-w-md truncate" title={log.text}>
                                            {log.text}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-slate-500">
                                                {log.createdAt?.toDate
                                                    ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true })
                                                    : 'N/A'
                                                }
                                            </p>
                                            <p className="text-[10px] text-slate-600">
                                                {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : ''}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <Eye className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400">No confession logs found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
