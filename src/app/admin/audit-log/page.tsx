'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { Ban, CheckCircle, ClipboardList, RefreshCw, Search, Shield, Trash2, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface AuditLogEntry {
    id: string;
    action: string;
    adminUid?: string;
    adminEmail: string;
    adminName: string;
    targetId: string | null;
    targetType?: string | null;
    targetLabel?: string;
    details: string | null;
    timestamp: Timestamp | number | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    ban_user: { label: 'Banned User', icon: Ban, color: 'text-red-400 bg-red-500/15' },
    unban_user: { label: 'Unbanned User', icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/15' },
    promote_user: { label: 'Promoted to Admin', icon: Shield, color: 'text-[var(--ui-accent)] bg-[var(--ui-accent-dim)]' },
    promote_admin: { label: 'Promoted to Admin', icon: Shield, color: 'text-[var(--ui-accent)] bg-[var(--ui-accent-dim)]' },
    demote_user: { label: 'Demoted from Admin', icon: UserX, color: 'text-amber-400 bg-amber-500/15' },
    demote_admin: { label: 'Demoted from Admin', icon: UserX, color: 'text-amber-400 bg-amber-500/15' },
    delete_content: { label: 'Deleted Content', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
    bulk_delete_content: { label: 'Bulk Deleted Content', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
    delete_confession: { label: 'Deleted Confession', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
    delete_anon_message: { label: 'Deleted Anon Message', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
    report_resolved: { label: 'Resolved Report', icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/15' },
    report_dismissed: { label: 'Dismissed Report', icon: CheckCircle, color: 'text-zinc-400 bg-zinc-500/15' },
    resolve_report: { label: 'Resolved Report', icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/15' },
    dismiss_report: { label: 'Dismissed Report', icon: CheckCircle, color: 'text-zinc-400 bg-zinc-500/15' },
    delete_report: { label: 'Deleted Report', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
    publish_announcement: { label: 'Published Announcement', icon: Shield, color: 'text-[var(--ui-accent)] bg-[var(--ui-accent-dim)]' },
    delete_announcement: { label: 'Deleted Announcement', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
};

const FALLBACK_CONFIG = { label: 'Admin Action', icon: ClipboardList, color: 'text-[var(--ui-text-muted)] bg-[var(--ui-bg-elevated)]' };

export default function AdminAuditLogPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');

    const fetchLogs = useCallback(async (isRefresh = false) => {
        if (isRefresh) cacheInvalidate('admin_audit_log');
        setLoading(true);
        try {
            const data = await cacheGet<AuditLogEntry[]>(
                'admin_audit_log',
                async () => {
                    const q = query(collection(db, 'admin_audit_log'), orderBy('timestamp', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AuditLogEntry[];
                },
                { ttl: 30_000, swr: 120_000 }
            );
            setLogs(data);
        } catch {
            toast.error('Failed to load audit log.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filteredLogs = logs.filter(l => {
        const matchesSearch = !searchQuery ||
            l.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.targetLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.details?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAction = filterAction === 'all' || l.action === filterAction;
        return matchesSearch && matchesAction;
    });

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                        <ClipboardList className="h-5 w-5 text-[var(--ui-accent)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Admin Audit Log</h1>
                        <p className="text-sm text-[var(--ui-text-muted)] mt-1">Track all admin actions for accountability and transparency.</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchLogs(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Search & Filter */}
            <div className="surface p-4 mb-6 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ui-text-muted)]" />
                    <input type="text" className="input pl-10" placeholder="Search by admin, target, or details..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2 text-sm text-[var(--ui-text)] focus:outline-none appearance-none"
                >
                    <option value="all">All Actions</option>
                    {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                    ))}
                </select>
            </div>

            {/* Log List */}
            <div className="surface overflow-hidden divide-y divide-[var(--ui-divider)]">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Loading audit log...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-16 text-center">
                        <ClipboardList className="h-12 w-12 text-[var(--ui-text-muted)] mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-[var(--ui-text)] mb-1">
                            {logs.length === 0 ? 'No Audit Entries' : 'No Matching Entries'}
                        </h2>
                        <p className="text-sm text-[var(--ui-text-muted)]">
                            {logs.length === 0 ? 'Admin actions will be logged here automatically.' : 'Try adjusting your search or filter.'}
                        </p>
                    </div>
                ) : (
                    filteredLogs.map((entry) => {
                        const config = ACTION_CONFIG[entry.action] || FALLBACK_CONFIG;
                        const ActionIcon = config.icon;
                        const ts = typeof entry.timestamp === 'number'
                            ? new Date(entry.timestamp)
                            : (entry.timestamp as Timestamp | null)?.toDate?.() ?? null;
                        const targetDisplay = entry.targetLabel || entry.targetId || '';
                        return (
                            <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--ui-bg-hover)] transition-colors">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                                    <ActionIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span className="text-sm font-semibold text-[var(--ui-text)]">{config.label}</span>
                                        <span className="text-xs text-[var(--ui-text-muted)]">by</span>
                                        <span className="text-xs font-medium text-[var(--ui-accent)]">{entry.adminEmail || entry.adminName}</span>
                                    </div>
                                    {targetDisplay && (
                                        <p className="text-sm text-[var(--ui-text-secondary)]">
                                            Target: <span className="font-medium text-[var(--ui-text)]">{targetDisplay}</span>
                                            {entry.targetType && (
                                                <span className="text-xs text-[var(--ui-text-muted)] ml-1">({entry.targetType})</span>
                                            )}
                                        </p>
                                    )}
                                    {entry.details && (
                                        <p className="text-xs text-[var(--ui-text-muted)] mt-0.5 line-clamp-2">{entry.details}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[11px] text-[var(--ui-text-muted)]">
                                        {ts ? formatDistanceToNow(ts, { addSuffix: true }) : 'N/A'}
                                    </p>
                                    <p className="text-[10px] text-[var(--ui-text-muted)]">
                                        {ts ? format(ts, 'dd MMM yyyy HH:mm') : ''}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

