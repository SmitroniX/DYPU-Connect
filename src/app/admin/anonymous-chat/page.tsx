'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ImageIcon, Search, Terminal, Trash2 } from 'lucide-react';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { logAdminAction } from '@/lib/auditLog';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
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
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { user } = useAuth();
    const { userProfile } = useStore();

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await cacheGet<AnonChatLog[]>(
                'admin_anon_chat',
                async () => {
                    const q = query(collection(db, 'anonymous_public_chat_private'), orderBy('timestamp', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(d => ({
                        id: d.id,
                        ...(d.data() as Omit<AnonChatLog, 'id'>),
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

    const handleDelete = async (log: AnonChatLog) => {
        if (!confirm(`Delete this anonymous message by ${log.email || 'Unknown'}?\n\nThis will remove both the public message and the private tracking record.`)) return;

        setDeletingId(log.id);
        try {
            // Delete public message (messageId is the doc ID in anonymous_public_chat)
            // Delete private tracking record
            await Promise.all([
                deleteDoc(doc(db, 'anonymous_public_chat', log.messageId)).catch(() => {}),
                deleteDoc(doc(db, 'anonymous_public_chat_private', log.id)),
            ]);

            // Audit log
            if (user && userProfile) {
                logAdminAction({
                    action: 'delete_anon_message',
                    adminUid: user.uid,
                    adminEmail: user.email ?? '',
                    adminName: userProfile.name,
                    targetId: log.messageId,
                    targetType: 'anonymous_chat',
                    details: `Deleted anon message by ${log.email || 'Unknown'}: "${(log.text || '[GIF]').slice(0, 100)}"`,
                });
            }

            cacheInvalidate('admin_anon_chat');
            cacheInvalidate('admin_content_anonymous_chat');
            cacheInvalidate('admin_dashboard');
            setLogs(prev => prev.filter(l => l.id !== log.id));
            toast.success('Anonymous message deleted (public + tracking).');
        } catch {
            toast.error('Failed to delete message.');
        } finally {
            setDeletingId(null);
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
            <div className="mb-6 surface border-[var(--ui-accent)]/20 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                    <Terminal className="h-5 w-5 text-[var(--ui-accent)]" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Shadow Realm Oversight</h1>
                        {!loading && (
                            <span className="inline-flex items-center rounded-full bg-[var(--ui-accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20">
                                {filteredLogs.length} intercepted
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--ui-accent)]/70 mt-1">
                        Monitoring stream for Anonymous Public Chat. Real email addresses attached to masked messages.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="surface p-4 mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                    </div>
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Search by email, message text, or user ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="surface overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Decrypting streams...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--ui-divider)]">
                            <thead className="bg-[var(--ui-bg-elevated)]">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Target Identity</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Message Content</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Time Intercepted</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ui-divider)]">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--ui-bg-hover)] transition-colors group">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-sm font-bold text-red-400 font-mono tracking-tight">{log.email || 'Unknown'}</span>
                                            <div className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">UID: {log.userId}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-[var(--ui-text-secondary)] max-w-xl">
                                            <div className="flex items-start gap-2">
                                                <p className="truncate" title={log.text}>{log.text || '[No text]'}</p>
                                                {log.gifUrl && (
                                                    <div className="shrink-0 relative">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={log.gifUrl}
                                                            alt="GIF"
                                                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--ui-border)]"
                                                        />
                                                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded bg-[var(--ui-accent)] flex items-center justify-center">
                                                            <ImageIcon className="h-2.5 w-2.5 text-[var(--ui-bg-elevated)]" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-[var(--ui-text-muted)]">
                                                {log.timestamp?.toDate
                                                    ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })
                                                    : 'N/A'
                                                }
                                            </p>
                                            <p className="text-[10px] text-[var(--ui-text-muted)]">
                                                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : ''}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleDelete(log)}
                                                disabled={deletingId === log.id}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                                title="Delete message (public + tracking)"
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
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <Terminal className="h-10 w-10 text-[var(--ui-text-muted)] mx-auto mb-3" />
                                            <p className="text-sm text-[var(--ui-text-muted)]">No shadow messages intercepted</p>
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
