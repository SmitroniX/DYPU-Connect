'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { useStore } from '@/store/useStore';
import { AlertCircle, Bell, Info, Megaphone, Plus, RefreshCw, Send, Trash2, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { PROFILE_FIELDS, PROFILE_YEARS } from '@/types/profile';

type Priority = 'info' | 'warning' | 'critical';
type Audience = 'all' | string; // 'all' or specific field/year

interface Announcement {
    id: string;
    title: string;
    body: string;
    priority: Priority;
    targetAudience: Audience;
    authorId: string;
    authorName: string;
    authorEmail: string;
    createdAt: Timestamp | null;
    expiresAt: Timestamp | null;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
    info: { label: 'Info', icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/15 ring-blue-500/20' },
    warning: { label: 'Warning', icon: AlertCircle, color: 'text-amber-400', bgColor: 'bg-amber-500/15 ring-amber-500/20' },
    critical: { label: 'Critical', icon: Zap, color: 'text-red-400', bgColor: 'bg-red-500/15 ring-red-500/20' },
};

export default function AdminAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [sending, setSending] = useState(false);
    const { userProfile, currentUser } = useStore();

    // Compose form
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState<Priority>('info');
    const [targetAudience, setTargetAudience] = useState<Audience>('all');
    const [expiresInDays, setExpiresInDays] = useState(7);

    const fetchAnnouncements = useCallback(async (isRefresh = false) => {
        if (isRefresh) cacheInvalidate('admin_announcements');
        setLoading(true);
        try {
            const data = await cacheGet<Announcement[]>(
                'admin_announcements',
                async () => {
                    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(50));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[];
                },
                { ttl: 30_000, swr: 120_000 }
            );
            setAnnouncements(data);
        } catch {
            toast.error('Failed to load announcements.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

    const handlePublish = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Title and body are required.');
            return;
        }
        if (!currentUser || !userProfile) return;

        setSending(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            await addDoc(collection(db, 'announcements'), {
                title: title.trim(),
                body: body.trim(),
                priority,
                targetAudience,
                authorId: currentUser.uid,
                authorName: userProfile.name,
                authorEmail: userProfile.email,
                createdAt: serverTimestamp(),
                expiresAt,
            });

            cacheInvalidate('admin_announcements');
            setTitle('');
            setBody('');
            setPriority('info');
            setTargetAudience('all');
            setExpiresInDays(7);
            setShowCompose(false);
            toast.success('Announcement published! 📢');
            fetchAnnouncements(true);
        } catch {
            toast.error('Failed to publish announcement.');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this announcement? Students will no longer see it.')) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            cacheInvalidate('admin_announcements');
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            toast.success('Announcement deleted.');
        } catch {
            toast.error('Failed to delete.');
        }
    };

    const now = new Date();

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                        <Megaphone className="h-5 w-5 text-[var(--ui-accent)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Announcements</h1>
                        <p className="text-sm text-[var(--ui-text-muted)] mt-1">Broadcast notices to all students or specific groups.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchAnnouncements(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3 py-2.5 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setShowCompose(!showCompose)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--ui-bg-elevated)] transition-colors"
                    >
                        {showCompose ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showCompose ? 'Cancel' : 'New Announcement'}
                    </button>
                </div>
            </div>

            {/* Compose Form */}
            {showCompose && (
                <div className="surface p-6 mb-6 animate-[fade-in-up_0.2s_ease-out]">
                    <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-4">Compose Announcement</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">Title</label>
                            <input type="text" className="input" placeholder="e.g. Exam Schedule Update" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">Body</label>
                            <textarea className="input resize-none min-h-[100px]" placeholder="Write your announcement..." value={body} onChange={(e) => setBody(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">Priority</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2.5 text-sm text-[var(--ui-text)] focus:outline-none appearance-none">
                                    <option value="info">ℹ️ Info</option>
                                    <option value="warning">⚠️ Warning</option>
                                    <option value="critical">🚨 Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">Audience</label>
                                <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2.5 text-sm text-[var(--ui-text)] focus:outline-none appearance-none">
                                    <option value="all">All Students</option>
                                    {PROFILE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                    {PROFILE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">Expires In</label>
                                <select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} className="w-full rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2.5 text-sm text-[var(--ui-text)] focus:outline-none appearance-none">
                                    <option value={1}>1 day</option>
                                    <option value={3}>3 days</option>
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days</option>
                                    <option value={30}>30 days</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handlePublish}
                                disabled={sending || !title.trim() || !body.trim()}
                                className="inline-flex items-center gap-2 rounded-lg bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] px-5 py-2.5 text-sm font-semibold text-[var(--ui-bg-elevated)] disabled:opacity-50 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                                {sending ? 'Publishing...' : 'Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcements List */}
            <div className="surface overflow-hidden divide-y divide-[var(--ui-divider)]">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Loading announcements...</p>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="p-16 text-center">
                        <Bell className="h-12 w-12 text-[var(--ui-text-muted)] mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-[var(--ui-text)] mb-1">No Announcements</h2>
                        <p className="text-sm text-[var(--ui-text-muted)]">Create one to broadcast notices to students.</p>
                    </div>
                ) : (
                    announcements.map((ann) => {
                        const pc = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.info;
                        const PIcon = pc.icon;
                        const expired = ann.expiresAt?.toDate ? ann.expiresAt.toDate() < now : false;

                        return (
                            <div key={ann.id} className={`p-5 hover:bg-[var(--ui-bg-hover)] transition-colors ${expired ? 'opacity-50' : ''}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${pc.bgColor}`}>
                                        <PIcon className={`h-4.5 w-4.5 ${pc.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-sm font-bold text-[var(--ui-text)]">{ann.title}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 ${pc.bgColor} ${pc.color}`}>
                                                {pc.label}
                                            </span>
                                            {ann.targetAudience !== 'all' && (
                                                <span className="inline-flex items-center rounded-full bg-[var(--ui-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-text-muted)]">
                                                    {ann.targetAudience}
                                                </span>
                                            )}
                                            {expired && (
                                                <span className="inline-flex items-center rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                                                    Expired
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--ui-text-secondary)] whitespace-pre-wrap break-words mb-2">{ann.body}</p>
                                        <p className="text-xs text-[var(--ui-text-muted)]">
                                            By {ann.authorName} · {ann.createdAt?.toDate ? formatDistanceToNow(ann.createdAt.toDate(), { addSuffix: true }) : ''}
                                            {ann.expiresAt?.toDate && ` · Expires ${formatDistanceToNow(ann.expiresAt.toDate(), { addSuffix: true })}`}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDelete(ann.id)} className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0" title="Delete">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

