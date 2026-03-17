'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { logAdminAction } from '@/lib/auditLog';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { AlertTriangle, CheckCircle, Clock, Flag, Inbox, Search, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type ReportStatus = 'pending' | 'resolved' | 'dismissed';
type ContentType = 'confession' | 'public_chat' | 'anonymous_chat' | 'user' | 'auto-flagged';

interface Report {
    id: string;
    reporterId: string;
    reporterEmail: string;
    reporterName: string;
    reportedContentId: string;
    contentType: ContentType;
    contentPreview: string;
    reason: string;
    status: ReportStatus;
    resolvedBy?: string;
    resolvedAt?: Timestamp | null;
    createdAt: Timestamp | null;
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-400 ring-amber-500/20', icon: Clock },
    resolved: { label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20', icon: CheckCircle },
    dismissed: { label: 'Dismissed', color: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20', icon: XCircle },
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    confession: 'Confession',
    public_chat: 'Public Chat',
    anonymous_chat: 'Anonymous Chat',
    user: 'User Report',
    'auto-flagged': 'Auto-Flagged',
};

export default function AdminReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
    const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
    const { userProfile } = useStore();
    const { user } = useAuth();

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cacheGet<Report[]>(
                'admin_reports',
                async () => {
                    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Report[];
                },
                { ttl: 30_000, swr: 120_000 }
            );
            setReports(data);
        } catch {
            toast.error('Failed to load reports.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
        try {
            await updateDoc(doc(db, 'reports', reportId), {
                status: newStatus,
                resolvedBy: userProfile?.email || 'admin',
                resolvedAt: serverTimestamp(),
            });
            cacheInvalidate('admin_reports');
            if (user && userProfile) {
                const report = reports.find(r => r.id === reportId);
                logAdminAction({
                    action: `report_${newStatus}`,
                    adminUid: user.uid,
                    adminEmail: user.email ?? '',
                    adminName: userProfile.name,
                    targetId: reportId,
                    targetType: 'report',
                    details: `Marked report as ${newStatus} (type: ${report?.contentType || 'unknown'}, reason: ${report?.reason?.slice(0, 80) || 'N/A'})`,
                });
            }
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
            toast.success(`Report ${newStatus}.`);
        } catch {
            toast.error('Failed to update report.');
        }
    };

    const deleteReport = async (reportId: string) => {
        try {
            const report = reports.find(r => r.id === reportId);
            await deleteDoc(doc(db, 'reports', reportId));
            cacheInvalidate('admin_reports');
            if (user && userProfile) {
                logAdminAction({
                    action: 'delete_report',
                    adminUid: user.uid,
                    adminEmail: user.email ?? '',
                    adminName: userProfile.name,
                    targetId: reportId,
                    targetType: 'report',
                    details: `Deleted report (type: ${report?.contentType || 'unknown'}, reason: ${report?.reason?.slice(0, 80) || 'N/A'})`,
                });
            }
            setReports(prev => prev.filter(r => r.id !== reportId));
            toast.success('Report deleted.');
        } catch {
            toast.error('Failed to delete report.');
        }
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = !searchQuery ||
            r.reporterEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.contentPreview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.reason?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchesType = filterType === 'all' || r.contentType === filterType;
        return matchesSearch && matchesStatus && matchesType;
    });

    const pendingCount = reports.filter(r => r.status === 'pending').length;

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="mb-6 surface border-red-500/20 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/20 shrink-0">
                    <ShieldAlert className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Moderation Reports</h1>
                        {!loading && pendingCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 ring-1 ring-red-500/20">
                                {pendingCount} pending
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-red-300/70 mt-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Review user-submitted reports and auto-flagged content.
                    </p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="surface p-4 mb-6 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ui-text-muted)]" />
                    <input type="text" className="input pl-10" placeholder="Search by reporter, content, or reason..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-3">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ReportStatus | 'all')} className="rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2 text-sm text-[var(--ui-text)] focus:outline-none appearance-none">
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value as ContentType | 'all')} className="rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2 text-sm text-[var(--ui-text)] focus:outline-none appearance-none">
                        <option value="all">All Types</option>
                        <option value="confession">Confessions</option>
                        <option value="public_chat">Public Chat</option>
                        <option value="anonymous_chat">Anonymous Chat</option>
                        <option value="user">User Reports</option>
                        <option value="auto-flagged">Auto-Flagged</option>
                    </select>
                </div>
            </div>

            {/* Reports List */}
            <div className="surface overflow-hidden divide-y divide-[var(--ui-divider)]">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-red-500/30 border-t-red-400 animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Loading reports...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 rounded-3xl bg-[var(--ui-accent)]/10 blur-2xl" />
                            <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-[var(--ui-bg-elevated)] ring-1 ring-[var(--ui-border)]">
                                <Inbox className="h-10 w-10 text-[var(--ui-text-muted)]" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-[var(--ui-text)] mb-2">
                            {reports.length === 0 ? 'No Reports Yet' : 'No Matching Reports'}
                        </h2>
                        <p className="text-sm text-[var(--ui-text-muted)] max-w-md">
                            {reports.length === 0 ? 'When users report content using the flag button, reports will appear here.' : 'Try adjusting your search or filter criteria.'}
                        </p>
                    </div>
                ) : (
                    filteredReports.map((report) => {
                        const sc = STATUS_CONFIG[report.status];
                        const StatusIcon = sc.icon;
                        return (
                            <div key={report.id} className="p-5 hover:bg-[var(--ui-bg-hover)] transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/20">
                                        <Flag className="h-4 w-4 text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 ${sc.color}`}>
                                                <StatusIcon className="h-3 w-3" />{sc.label}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-[var(--ui-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-text-muted)]">
                                                {CONTENT_TYPE_LABELS[report.contentType]}
                                            </span>
                                            <span className="text-[11px] text-[var(--ui-text-muted)]">
                                                {report.createdAt?.toDate ? formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-[var(--ui-text)] mb-1">
                                            Reason: <span className="text-[var(--ui-text-secondary)] font-normal">{report.reason}</span>
                                        </p>
                                        <div className="callout text-sm text-[var(--ui-text-muted)] mt-2 mb-2 max-w-2xl">
                                            <p className="line-clamp-2">{report.contentPreview || '[No preview]'}</p>
                                        </div>
                                        <p className="text-xs text-[var(--ui-text-muted)]">
                                            Reported by <span className="text-[var(--ui-text-secondary)] font-medium">{report.reporterName || report.reporterEmail}</span>
                                        </p>
                                        {report.resolvedBy && (
                                            <p className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">{report.status === 'resolved' ? 'Resolved' : 'Dismissed'} by {report.resolvedBy}</p>
                                        )}
                                    </div>
                                    {report.status === 'pending' ? (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => updateReportStatus(report.id, 'resolved')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                                <CheckCircle className="h-3 w-3" />Resolve
                                            </button>
                                            <button onClick={() => updateReportStatus(report.id, 'dismissed')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] transition-colors">
                                                <XCircle className="h-3 w-3" />Dismiss
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => deleteReport(report.id)} className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0" title="Delete report">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
