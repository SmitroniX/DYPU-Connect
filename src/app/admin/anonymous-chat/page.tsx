'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ImageIcon, Search, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface AnonChatLog {
    id: string;
    messageId: string;
    userId: string;
    email: string;
    text: string;
    gifUrl?: string;
    sessionId: string;
    timestamp: Timestamp | null;
}

export default function AdminAnonChatPage() {
    const [logs, setLogs] = useState<AnonChatLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'anonymous_public_chat_private'), orderBy('timestamp', 'desc'), limit(200));
            const snapshot = await getDocs(q);
            const data: AnonChatLog[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<AnonChatLog, 'id'>),
            }));
            setLogs(data);
        } catch {
            toast.error('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return log.email?.toLowerCase().includes(q) ||
            log.text?.toLowerCase().includes(q) ||
            log.userId?.toLowerCase().includes(q);
    });

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="mb-6 glass border-purple-500/20 bg-purple-500/5 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 ring-1 ring-purple-500/20 shrink-0">
                    <Terminal className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Shadow Realm Oversight</h1>
                        {!loading && (
                            <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400 ring-1 ring-purple-500/20">
                                {filteredLogs.length} intercepted
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-purple-300/70 mt-1">
                        Monitoring stream for Anonymous Public Chat. Real email addresses attached to masked messages.
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
                        className="block w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/30 transition-all"
                        placeholder="Search by email, message text, or user ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                        <p className="text-sm text-slate-500">Decrypting streams...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-purple-500/5">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">Target Identity</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">Message Content</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">Time Intercepted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-purple-500/5 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-sm font-bold text-red-400 font-mono tracking-tight">{log.email}</span>
                                            <div className="text-[10px] text-slate-600 mt-0.5">UID: {log.userId}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300 max-w-xl">
                                            <div className="flex items-start gap-2">
                                                <p className="truncate" title={log.text}>{log.text || '[No text]'}</p>
                                                {log.gifUrl && (
                                                    <div className="shrink-0 relative">
                                                        <img
                                                            src={log.gifUrl}
                                                            alt="GIF"
                                                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
                                                        />
                                                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded bg-purple-500/80 flex items-center justify-center">
                                                            <ImageIcon className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-slate-500">
                                                {log.timestamp?.toDate
                                                    ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })
                                                    : 'N/A'
                                                }
                                            </p>
                                            <p className="text-[10px] text-slate-600">
                                                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : ''}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <Terminal className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400">No shadow messages intercepted</p>
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
