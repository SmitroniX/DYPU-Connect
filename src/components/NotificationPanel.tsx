'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import {
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    type AppNotification,
    type NotificationType,
} from '@/lib/notifications';
import {
    Bell,
    MessageSquare,
    AtSign,
    Megaphone,
    Info,
    Users,
    MessageCircle,
    CheckCheck,
    Trash2,
    X,
} from 'lucide-react';
import { resolveProfileImage } from '@/lib/profileImage';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';

/* ── Type icon mapping ── */

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
    message: MessageSquare,
    mention: AtSign,
    announcement: Megaphone,
    system: Info,
    group_invite: Users,
    confession_reply: MessageCircle,
};

const TYPE_COLORS: Record<NotificationType, string> = {
    message: 'text-blue-400 bg-blue-500/15',
    mention: 'text-amber-400 bg-amber-500/15',
    announcement: 'text-[var(--ui-accent)] bg-[var(--ui-accent-dim)]',
    system: 'text-[var(--ui-text-muted)] bg-[var(--ui-bg-elevated)]',
    group_invite: 'text-emerald-400 bg-emerald-500/15',
    confession_reply: 'text-purple-400 bg-purple-500/15',
};

/* ── Time grouping ── */

function getTimeGroup(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const DAY = 86_400_000;
    if (diff < DAY) return 'Today';
    if (diff < 2 * DAY) return 'Yesterday';
    if (diff < 7 * DAY) return 'This Week';
    return 'Earlier';
}

function groupNotifications(notifs: AppNotification[]): { label: string; items: AppNotification[] }[] {
    const groups: Map<string, AppNotification[]> = new Map();
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];

    for (const n of notifs) {
        const label = getTimeGroup(n.createdAt);
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push(n);
    }

    return order
        .filter((label) => groups.has(label))
        .map((label) => ({ label, items: groups.get(label)! }));
}

/* ── Component ── */

export default function NotificationPanel() {
    const router = useRouter();
    const { user } = useAuth();
    const {
        notifications,
        unreadCount,
        notificationPanelOpen: open,
        setNotificationPanelOpen: setOpen,
    } = useStore();
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        // Delay attaching to avoid the same click that opened it
        const timer = setTimeout(() => window.addEventListener('mousedown', handler), 0);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousedown', handler);
        };
    }, [open, setOpen]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, setOpen]);

    if (!open) return null;

    const grouped = groupNotifications(notifications);

    const handleClick = async (notif: AppNotification) => {
        if (!user) return;
        if (!notif.read) {
            markNotificationRead(user.uid, notif.id).catch(() => {});
        }
        if (notif.link) {
            router.push(notif.link);
        }
        setOpen(false);
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await markAllNotificationsRead(user.uid);
            toast.success('All notifications marked as read.');
        } catch {
            toast.error('Failed to mark notifications as read.');
        }
    };

    const handleDelete = async (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        if (!user) return;
        try {
            await deleteNotification(user.uid, notifId);
        } catch {
            toast.error('Failed to delete notification.');
        }
    };

    const handleClearAll = async () => {
        if (!user) return;
        try {
            await clearAllNotifications(user.uid);
            toast.success('All notifications cleared.');
        } catch {
            toast.error('Failed to clear notifications.');
        }
    };

    return (
        <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            aria-modal="true"
            className="absolute left-full top-0 ml-2 w-[360px] max-h-[calc(100vh-6rem)] bg-[var(--ui-bg-surface)] border border-[var(--ui-divider)] rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-[fade-in-up_0.15s_ease-out]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ui-divider)] shrink-0">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[var(--ui-accent)]" />
                    <h3 className="text-sm font-semibold text-[var(--ui-text)]">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[var(--ui-accent)] px-1.5 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Mark all as read"
                        >
                            <CheckCheck className="h-4 w-4" />
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            title="Clear all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="h-12 w-12 rounded-2xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-3">
                            <Bell className="h-6 w-6 text-[var(--ui-text-muted)]" />
                        </div>
                        <p className="text-sm text-[var(--ui-text-muted)]">No notifications yet</p>
                        <p className="text-xs text-[var(--ui-text-muted)] mt-1">You&apos;re all caught up!</p>
                    </div>
                ) : (
                    grouped.map((group) => (
                        <div key={group.label}>
                            <div className="px-4 pt-3 pb-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)]">
                                    {group.label}
                                </p>
                            </div>
                            {group.items.map((notif) => {
                                const Icon = TYPE_ICONS[notif.type] || Info;
                                const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.system;
                                return (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleClick(notif)}
                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--ui-bg-hover)] group ${
                                            !notif.read ? 'bg-[var(--ui-accent)]/[0.03]' : ''
                                        }`}
                                    >
                                        {/* Avatar or icon */}
                                        {notif.senderImage ? (
                                            <img
                                                src={resolveProfileImage(notif.senderImage, '', notif.senderName || '')}
                                                alt=""
                                                className="h-9 w-9 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-[13px] font-medium truncate ${notif.read ? 'text-[var(--ui-text-secondary)]' : 'text-[var(--ui-text)]'}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.read && (
                                                    <span className="h-2 w-2 rounded-full bg-[var(--ui-accent)] shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-[var(--ui-text-muted)] truncate mt-0.5">
                                                {notif.body}
                                            </p>
                                            <p className="text-[10px] text-[var(--ui-text-muted)] mt-1">
                                                {formatDistanceToNowStrict(new Date(notif.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>

                                        {/* Delete button (on hover) */}
                                        <button
                                            onClick={(e) => handleDelete(e, notif.id)}
                                            className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1"
                                            title="Remove"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

