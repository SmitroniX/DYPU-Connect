'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ImageIcon, Search, Terminal } from 'lucide-react';
import { cacheGet } from '@/lib/cache';
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
            const data = await cacheGet<AnonChatLog[]>(
                'admin_anon_chat',
                async () => {
                    const q = query(collection(db, 'anonymous_public_chat_private'), orderBy('timestamp', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...(doc.data() as Omit<AnonChatLog, 'id'>),
                    }));
                },
                { ttl: 60_000, swr: 300_000 }
            );
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
            <div className="mb-6 dc-card border-[var(--dc-accent)]/20 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dc-accent-dim)] ring-1 ring-[var(--dc-accent)]/20 shrink-0">
                    <Terminal className="h-5 w-5 text-[var(--dc-accent)]" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--dc-text-primary)]">Shadow Realm Oversight</h1>
                        {!loading && (
                            <span className="inline-flex items-center rounded-full bg-[var(--dc-accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--dc-accent)] ring-1 ring-[var(--dc-accent)]/20">
                                {filteredLogs.length} intercepted
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--dc-accent)]/70 mt-1">
                        Monitoring stream for Anonymous Public Chat. Real email addresses attached to masked messages.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="dc-card p-4 mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4.5 w-4.5 text-[var(--dc-text-muted)]" />
                    </div>
                    <input
                        type="text"
                        className="dc-input pl-10"
                        placeholder="Search by email, message text, or user ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="dc-card overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--dc-accent)]/30 border-t-[var(--dc-accent)] animate-spin" />
                        <p className="text-sm text-[var(--dc-text-muted)]">Decrypting streams...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--dc-divider)]">
                            <thead className="bg-[var(--dc-bg-tertiary)]">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--dc-text-muted)] uppercase tracking-wider">Target Identity</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--dc-text-muted)] uppercase tracking-wider">Message Content</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--dc-text-muted)] uppercase tracking-wider">Time Intercepted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--dc-divider)]">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--dc-bg-hover)] transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-sm font-bold text-red-400 font-mono tracking-tight">{log.email}</span>
                                            <div className="text-[10px] text-[var(--dc-text-muted)] mt-0.5">UID: {log.userId}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-[var(--dc-text-secondary)] max-w-xl">
                                            <div className="flex items-start gap-2">
                                                <p className="truncate" title={log.text}>{log.text || '[No text]'}</p>
                                                {log.gifUrl && (
                                                    <div className="shrink-0 relative">
                                                        <img
                                                            src={log.gifUrl}
                                                            alt="GIF"
                                                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--dc-border)]"
                                                        />
                                                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded bg-[var(--dc-accent)] flex items-center justify-center">
                                                            <ImageIcon className="h-2.5 w-2.5 text-[var(--dc-bg-tertiary)]" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-[var(--dc-text-muted)]">
                                                {log.timestamp?.toDate
                                                    ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })
                                                    : 'N/A'
                                                }
                                            </p>
                                            <p className="text-[10px] text-[var(--dc-text-muted)]">
                                                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : ''}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <Terminal className="h-10 w-10 text-[var(--dc-text-muted)] mx-auto mb-3" />
                                            <p className="text-sm text-[var(--dc-text-muted)]">No shadow messages intercepted</p>
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
