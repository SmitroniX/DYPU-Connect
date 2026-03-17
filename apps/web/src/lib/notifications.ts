import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    limit,
    onSnapshot,
    where,
    getDocs,
    writeBatch,
    serverTimestamp,
    type Timestamp,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ══════════════════════════════════════════════════════
   Notification Types
   ══════════════════════════════════════════════════════ */

export type NotificationType =
    | 'message'
    | 'mention'
    | 'announcement'
    | 'system'
    | 'group_invite'
    | 'confession_reply';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    /** Route to navigate to when clicked */
    link?: string;
    read: boolean;
    createdAt: number;
    /** Sender display name (for message / mention types) */
    senderName?: string;
    /** Sender profile image URL */
    senderImage?: string;
}

interface NotificationCreateData {
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    senderName?: string;
    senderImage?: string;
}

/* ══════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════ */

function notificationsRef(userId: string) {
    return collection(db, 'users', userId, 'notifications');
}

function notificationDocRef(userId: string, notifId: string) {
    return doc(db, 'users', userId, 'notifications', notifId);
}

function toAppNotification(docSnap: { id: string; data: () => Record<string, unknown> }): AppNotification {
    const d = docSnap.data();
    const ts = d.createdAt as Timestamp | null;
    return {
        id: docSnap.id,
        type: (d.type as NotificationType) || 'system',
        title: (d.title as string) || '',
        body: (d.body as string) || '',
        link: (d.link as string) || undefined,
        read: !!(d.read),
        createdAt: ts?.toMillis?.() ?? Date.now(),
        senderName: (d.senderName as string) || undefined,
        senderImage: (d.senderImage as string) || undefined,
    };
}

/* ══════════════════════════════════════════════════════
   CRUD
   ══════════════════════════════════════════════════════ */

/**
 * Create a notification for a recipient. Fire-and-forget pattern.
 */
export async function createNotification(
    recipientUserId: string,
    data: NotificationCreateData,
): Promise<void> {
    try {
        await addDoc(notificationsRef(recipientUserId), {
            type: data.type,
            title: data.title,
            body: data.body.slice(0, 300), // cap body length
            link: data.link ?? null,
            read: false,
            createdAt: serverTimestamp(),
            senderName: data.senderName ?? null,
            senderImage: data.senderImage ?? null,
        });
    } catch (err) {
        console.warn('[Notifications] Failed to create notification:', err);
    }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
    userId: string,
    notifId: string,
): Promise<void> {
    await updateDoc(notificationDocRef(userId, notifId), { read: true });
}

/**
 * Mark ALL unread notifications as read (batched write).
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
    const q = query(
        notificationsRef(userId),
        where('read', '==', false),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
    });
    await batch.commit();
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(
    userId: string,
    notifId: string,
): Promise<void> {
    await deleteDoc(notificationDocRef(userId, notifId));
}

/**
 * Delete all notifications for a user (batched).
 */
export async function clearAllNotifications(userId: string): Promise<void> {
    const q = query(notificationsRef(userId), limit(500));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}

/* ══════════════════════════════════════════════════════
   Real-time Subscription
   ══════════════════════════════════════════════════════ */

/**
 * Subscribe to a user's latest notifications in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void,
    maxItems = 50,
): Unsubscribe {
    const q = query(
        notificationsRef(userId),
        orderBy('createdAt', 'desc'),
        limit(maxItems),
    );

    return onSnapshot(
        q,
        (snap) => {
            const notifs = snap.docs.map(toAppNotification);
            callback(notifs);
        },
        (err) => {
            console.warn('[Notifications] Snapshot listener error:', err);
        },
    );
}

