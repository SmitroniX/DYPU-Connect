import { addDoc, collection, getDocs, orderBy, query, limit as firestoreLimit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ActivityLogEntry {
    id: string;
    action: string;
    details: string;
    timestamp: number;
}

/**
 * Write an activity log entry to the user's subcollection.
 * Fire-and-forget — callers should NOT await this.
 */
export function logActivity(uid: string, action: string, details: string): void {
    if (!uid || !db) return;
    addDoc(collection(db, 'users', uid, 'activity_log'), {
        action,
        details,
        timestamp: Date.now(),
        serverTimestamp: serverTimestamp(),
    }).catch(() => {
        // Silent — logging should never break the main flow
    });
}

/**
 * Fetch the most recent activity log entries for a user.
 */
export async function fetchActivityLog(uid: string, maxEntries = 50): Promise<ActivityLogEntry[]> {
    if (!uid || !db) return [];
    const q = query(
        collection(db, 'users', uid, 'activity_log'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(maxEntries),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        action: doc.data().action ?? '',
        details: doc.data().details ?? '',
        timestamp: doc.data().timestamp ?? 0,
    }));
}

