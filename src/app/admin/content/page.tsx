'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { CheckSquare, EyeOff, MessageSquare, MessagesSquare, Search, Square, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type ContentTab = 'confessions' | 'public_chat' | 'anonymous_chat';

interface ContentItem {
    id: string;
    text: string;
    author: string;
    timestamp: Date | null;
    type: ContentTab;
    gifUrl?: string;
}

const TAB_CONFIG: Record<ContentTab, { label: string; icon: React.ElementType; collection: string }> = {
    confessions: { label: 'Confessions', icon: MessageSquare, collection: 'confessions_public' },
    public_chat: { label: 'Public Chat', icon: MessagesSquare, collection: 'public_chat' },
    anonymous_chat: { label: 'Anonymous Chat', icon: EyeOff, collection: 'anonymous_public_chat' },
};

export default function AdminContentPage() {
    const [activeTab, setActiveTab] = useState<ContentTab>('confessions');
    const [items, setItems] = useState<ContentItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchContent = useCallback(async (tab: ContentTab) => {
        setLoading(true);
        setSelected(new Set());
        try {
            const config = TAB_CONFIG[tab];
            const tsField = tab === 'confessions' ? 'createdAt' : 'timestamp';
            const data = await cacheGet<ContentItem[]>(
                `admin_content_${tab}`,
                async () => {
                    const q = query(collection(db, config.collection), orderBy(tsField, 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(d => {
                        const raw = d.data();
                        const ts = (raw[tsField] as Timestamp | null)?.toDate?.() ?? null;
                        return {
                            id: d.id,
                            text: raw.text || '',
                            author: tab === 'public_chat' ? (raw.senderName || 'Unknown') : (raw.anonymousName || 'Anonymous'),
                            timestamp: ts,
                            type: tab,
                            gifUrl: raw.gifUrl || undefined,
                        };
                    });
                },
                { ttl: 30_000, swr: 120_000 }
            );
            setItems(data);
        } catch {
            toast.error('Failed to load content.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchContent(activeTab); }, [activeTab, fetchContent]);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === filteredItems.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filteredItems.map(i => i.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selected.size === 0) return;
        const count = selected.size;
        if (!confirm(`Delete ${count} item${count > 1 ? 's' : ''} permanently? This cannot be undone.`)) return;

        setDeleting(true);
        try {
            const config = TAB_CONFIG[activeTab];
            const deletePromises = [...selected].map(id => deleteDoc(doc(db, config.collection, id)));
            await Promise.all(deletePromises);
            cacheInvalidate(`admin_content_${activeTab}`);
            setItems(prev => prev.filter(i => !selected.has(i.id)));
            setSelected(new Set());
            toast.success(`${count} item${count > 1 ? 's' : ''} deleted.`);
        } catch {
            toast.error('Failed to delete some items.');
        } finally {
            setDeleting(false);
        }
    };

    const filteredItems = items.filter(i => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return i.text?.toLowerCase().includes(q) || i.author?.toLowerCase().includes(q);
    });

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="mb-6 surface border-[var(--ui-accent)]/20 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                    <Trash2 className="h-5 w-5 text-[var(--ui-accent)]" />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Content Moderation</h1>
                    <p className="text-sm text-[var(--ui-text-muted)] mt-1">Browse, search, and remove content across all channels.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] mb-6">
                {(Object.entries(TAB_CONFIG) as [ContentTab, typeof TAB_CONFIG[ContentTab]][]).map(([key, config]) => {
                    const TabIcon = config.icon;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                                activeTab === key ? 'bg-[var(--ui-accent)] text-[var(--ui-bg-elevated)]' : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)]'
                            }`}
                        >
                            <TabIcon className="h-4 w-4" />
                            {config.label}
                        </button>
                    );
                })}
            </div>

            {/* Search + Actions */}
            <div className="surface p-4 mb-6 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ui-text-muted)]" />
                    <input type="text" className="input pl-10" placeholder="Search content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {selected.size > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-sm font-medium text-red-400">{selected.size} selected</span>
                        <button
                            onClick={handleBulkDelete}
                            disabled={deleting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deleting ? 'Deleting...' : 'Delete Selected'}
                        </button>
                        <button onClick={() => setSelected(new Set())} className="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">
                            Clear selection
                        </button>
                    </div>
                )}
            </div>

            {/* Content List */}
            <div className="surface overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Loading content...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-sm text-[var(--ui-text-muted)]">No content found.</p>
                    </div>
                ) : (
                    <>
                        {/* Select all bar */}
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--ui-bg-elevated)] border-b border-[var(--ui-divider)]">
                            <button onClick={selectAll} className="text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors">
                                {selected.size === filteredItems.length ? <CheckSquare className="h-4 w-4 text-[var(--ui-accent)]" /> : <Square className="h-4 w-4" />}
                            </button>
                            <span className="text-xs text-[var(--ui-text-muted)]">{filteredItems.length} items</span>
                        </div>

                        <div className="divide-y divide-[var(--ui-divider)]">
                            {filteredItems.map((item) => (
                                <div key={item.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--ui-bg-hover)] transition-colors ${selected.has(item.id) ? 'bg-[var(--ui-accent-dim)]' : ''}`}>
                                    <button onClick={() => toggleSelect(item.id)} className="mt-0.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors shrink-0">
                                        {selected.has(item.id) ? <CheckSquare className="h-4 w-4 text-[var(--ui-accent)]" /> : <Square className="h-4 w-4" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-sm font-medium text-[var(--ui-text)]">{item.author}</span>
                                            <span className="text-[11px] text-[var(--ui-text-muted)]">
                                                {item.timestamp ? formatDistanceToNow(item.timestamp, { addSuffix: true }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--ui-text-secondary)] line-clamp-2 break-words">{item.text || '[GIF only]'}</p>
                                        {item.gifUrl && (
                                            <img src={item.gifUrl} alt="GIF" className="h-12 w-12 rounded-lg mt-1 object-cover ring-1 ring-[var(--ui-border)]" />
                                        )}
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Delete this item permanently?')) return;
                                            try {
                                                await deleteDoc(doc(db, TAB_CONFIG[activeTab].collection, item.id));
                                                cacheInvalidate(`admin_content_${activeTab}`);
                                                setItems(prev => prev.filter(i => i.id !== item.id));
                                                toast.success('Item deleted.');
                                            } catch { toast.error('Failed to delete.'); }
                                        }}
                                        className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

