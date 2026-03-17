import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Log an admin action to `admin_audit_log` for accountability.
 * Fire-and-forget — callers should NOT await this.
 */
export function logAdminAction(opts: {
    action: string;
    adminUid: string;
    adminEmail: string;
    adminName: string;
    targetId?: string;
    targetType?: string;
    details?: string;
}): void {
    if (!db) return;
    addDoc(collection(db, 'admin_audit_log'), {
        action: opts.action,
        adminUid: opts.adminUid,
        adminEmail: opts.adminEmail,
        adminName: opts.adminName,
        targetId: opts.targetId ?? null,
        targetType: opts.targetType ?? null,
        details: opts.details ?? null,
        timestamp: Date.now(),
        serverTimestamp: serverTimestamp(),
    }).catch(() => {
        // Silent — audit logging should never break admin flows
    });
}

