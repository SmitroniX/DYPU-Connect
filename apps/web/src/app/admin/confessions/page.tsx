'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { AlertTriangle, Eye, Search, Trash2 } from 'lucide-react';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { logAdminAction } from '@/lib/auditLog';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
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
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { user } = useAuth();
    const { userProfile } = useStore();

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const combined = await cacheGet<(PrivateConfession & { text: string })[]>(
                'admin_confessions',
                async () => {
                    const q = query(collection(db, 'confessions_private'), orderBy('createdAt', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    const privateData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PrivateConfession[];

                    const pubQ = query(collection(db, 'confessions_public'), limit(500));
                    const pubSnapshot = await getDocs(pubQ);
                    const publicDataMap = pubSnapshot.docs.reduce((acc, d) => {
                        acc[d.id] = d.data().text;
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

    const handleDelete = async (log: PrivateConfession & { text: string }) => {
        if (!confirm(`Delete this confession by ${log.realName || log.email || 'Unknown'}?\n\nThis removes both the public confession and the private tracking record.`)) return;

        setDeletingId(log.id);
        try {
            await Promise.all([
                deleteDoc(doc(db, 'confessions_public', log.confessionId)).catch(() => {}),
                deleteDoc(doc(db, 'confessions_private', log.id)),
            ]);

            if (user && userProfile) {
                logAdminAction({
                    action: 'delete_confession',
                    adminUid: user.uid,
                    adminEmail: user.email ?? '',
                    adminName: userProfile.name,
                    targetId: log.confessionId,
                    targetType: 'confession',
                    details: `Deleted confession by ${log.realName || 'Unknown'} (${log.email || 'no email'}): "${log.text.slice(0, 100)}"`,
                });
            }

            cacheInvalidate('admin_confessions');
            cacheInvalidate('admin_content_confessions');
            cacheInvalidate('admin_dashboard');
            setLogs(prev => prev.filter(l => l.id !== log.id));
            toast.success('Confession deleted (public + tracking record).');
        } catch {
            toast.error('Failed to delete confession.');
        } finally {
            setDeletingId(null);
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
            <div className="mb-6 surface border-[var(--ui-accent)]/20 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                    <Eye className="h-5 w-5 text-[var(--ui-accent)]" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Confession Tracker</h1>
                        {!loading && (
                            <span className="inline-flex items-center rounded-full bg-[var(--ui-accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20">
                                {filteredLogs.length} records
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--ui-accent)]/70 mt-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Highly sensitive. Real identities associated with anonymous confessions are exposed.
                    </p>
                </div>
            </div>

            <div className="surface p-4 mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-[var(--ui-text-muted)]" />
                    </div>
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Search by name, email, alias, or confession text..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="surface overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Loading tracking logs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--ui-divider)]">
                            <thead className="bg-[var(--ui-bg-elevated)]">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Real Identity</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Anonymous Alias</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Confession Content</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Time</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ui-divider)]">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--ui-bg-hover)] transition-colors group">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-sm font-bold text-red-400">{log.realName || 'Unknown'}</p>
                                            <p className="text-xs text-[var(--ui-text-muted)]">{log.email || 'No email recorded'}</p>
                                            <p className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">UID: {log.userId}</p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-lg bg-[var(--ui-bg-elevated)] px-2.5 py-1 text-sm text-[var(--ui-text-secondary)] font-mono ring-1 ring-[var(--ui-border)]">
                                                {log.anonymousName}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-[var(--ui-text-muted)] max-w-md truncate" title={log.text}>
                                            {log.text}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-[var(--ui-text-muted)]">
                                                {log.createdAt?.toDate
                                                    ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true })
                                                    : 'N/A'
                                                }
                                            </p>
                                            <p className="text-[10px] text-[var(--ui-text-muted)]">
                                                {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : ''}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleDelete(log)}
                                                disabled={deletingId === log.id}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                                title="Delete confession (public + tracking)"
                                            >
                                                {deletingId === log.id ? (
                                                    <div className="h-3 w-3 rounded-full border border-red-400/40 border-t-red-400 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <Eye className="h-10 w-10 text-[var(--ui-text-muted)] mx-auto mb-3" />
                                            <p className="text-sm text-[var(--ui-text-muted)]">No confession logs found</p>
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
