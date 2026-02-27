'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'confessions_private'), orderBy('createdAt', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const privateData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrivateConfession[];

            const pubQ = query(collection(db, 'confessions_public'), limit(200));
            const pubSnapshot = await getDocs(pubQ);
            const publicDataMap = pubSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data().text;
                return acc;
            }, {} as Record<string, string>);

            const combined = privateData.map(log => ({
                ...log,
                text: publicDataMap[log.confessionId] || '[Deleted or Not Found]'
            }));
            setLogs(combined);
        } catch (error) {
            console.error("error fetching logs", error);
            toast.error('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.5s_ease-out]">
            <div className="mb-8 glass border-red-500/20 bg-red-500/5 p-6 flex items-start gap-4">
                <div className="p-3 bg-red-500/15 rounded-xl shrink-0">
                    <EyeOff className="w-6 h-6 text-red-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Confession Tracker</h1>
                    <p className="mt-1 text-sm text-red-300/80">
                        Highly sensitive area. Real identities associated with anonymous confessions are exposed below.
                    </p>
                </div>
            </div>

            <div className="glass overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading tracking logs...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Real Identity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Anonymous Alias</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Confession Content</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-red-500/5 transition-colors">
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            <div className="font-bold text-red-400">{log.realName}</div>
                                            <div className="text-slate-500 text-xs">{log.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-300 whitespace-nowrap font-mono bg-white/5">{log.anonymousName}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400 max-w-md truncate" title={log.text}>{log.text}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                            {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">No confession logs found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
