// Device & Session Tracking
// Records device info when a user logs in and manages active sessions.

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateSessionFingerprint } from '@/lib/security';

/* ── Types ── */

export interface DeviceSession {
    id: string;
    /** Device / OS name parsed from UA */
    device: string;
    /** Browser name + version */
    browser: string;
    /** Operating system */
    os: string;
    /** Session fingerprint (FNV-1a hash) */
    fingerprint: string;
    /** Whether this is the current session */
    isCurrent?: boolean;
    /** First seen timestamp (ms) */
    createdAt: number;
    /** Last active timestamp (ms) */
    lastActiveAt: number;
    /** Raw user agent (for admin debugging) */
    userAgent: string;
    /** Platform string */
    platform: string;
    /** Screen resolution */
    screenResolution: string;
    /** Timezone */
    timezone: string;
    /** Language */
    language: string;
}

/* ── UA Parsing Helpers ── */

function parseBrowser(ua: string): string {
    // Order matters — check specific browsers before generic engine matches
    if (ua.includes('Edg/')) {
        const match = ua.match(/Edg\/([\d.]+)/);
        return `Microsoft Edge ${match?.[1] ?? ''}`.trim();
    }
    if (ua.includes('OPR/') || ua.includes('Opera')) {
        const match = ua.match(/OPR\/([\d.]+)/) || ua.match(/Opera\/([\d.]+)/);
        return `Opera ${match?.[1] ?? ''}`.trim();
    }
    if (ua.includes('Brave')) {
        return 'Brave';
    }
    if (ua.includes('Vivaldi/')) {
        const match = ua.match(/Vivaldi\/([\d.]+)/);
        return `Vivaldi ${match?.[1] ?? ''}`.trim();
    }
    if (ua.includes('Chrome/') && !ua.includes('Chromium')) {
        const match = ua.match(/Chrome\/([\d.]+)/);
        return `Chrome ${match?.[1] ?? ''}`.trim();
    }
    if (ua.includes('Firefox/')) {
        const match = ua.match(/Firefox\/([\d.]+)/);
        return `Firefox ${match?.[1] ?? ''}`.trim();
    }
    if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        const match = ua.match(/Version\/([\d.]+)/);
        return `Safari ${match?.[1] ?? ''}`.trim();
    }
    return 'Unknown Browser';
}

function parseOS(ua: string): string {
    if (ua.includes('Windows NT 10')) return 'Windows 10/11';
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) {
        const match = ua.match(/Mac OS X ([\d_]+)/);
        return `macOS ${match?.[1]?.replace(/_/g, '.') ?? ''}`.trim();
    }
    if (ua.includes('CrOS')) return 'Chrome OS';
    if (ua.includes('Android')) {
        const match = ua.match(/Android ([\d.]+)/);
        return `Android ${match?.[1] ?? ''}`.trim();
    }
    if (ua.includes('iPhone') || ua.includes('iPad')) {
        const match = ua.match(/OS ([\d_]+)/);
        return `iOS ${match?.[1]?.replace(/_/g, '.') ?? ''}`.trim();
    }
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
}

function parseDevice(ua: string): string {
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android') && ua.includes('Mobile')) return 'Android Phone';
    if (ua.includes('Android')) return 'Android Tablet';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('CrOS')) return 'Chromebook';
    if (ua.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
}

/* ── Collect current device info ── */

export function collectDeviceInfo(): Omit<DeviceSession, 'id' | 'isCurrent' | 'createdAt' | 'lastActiveAt'> {
    if (typeof window === 'undefined') {
        return {
            device: 'Server',
            browser: 'SSR',
            os: 'Node.js',
            fingerprint: '',
            userAgent: '',
            platform: '',
            screenResolution: '',
            timezone: '',
            language: '',
        };
    }

    const ua = navigator.userAgent;

    return {
        device: parseDevice(ua),
        browser: parseBrowser(ua),
        os: parseOS(ua),
        fingerprint: generateSessionFingerprint(),
        userAgent: ua,
        platform: navigator.platform || '',
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
    };
}

/* ── Register a device session on login ── */

export async function registerDeviceSession(uid: string): Promise<string> {
    if (!uid || !db) return '';

    const info = collectDeviceInfo();
    const now = Date.now();

    // Check if a session with the same fingerprint already exists
    const sessionsRef = collection(db, 'users', uid, 'sessions');
    const existing = await getDocs(sessionsRef);
    const existingSession = existing.docs.find(
        (d) => d.data().fingerprint === info.fingerprint,
    );

    if (existingSession) {
        // Update last active time
        await updateDoc(existingSession.ref, {
            lastActiveAt: now,
            browser: info.browser,
            os: info.os,
            device: info.device,
            userAgent: info.userAgent,
        });
        return existingSession.id;
    }

    // Create new session
    const docRef = await addDoc(sessionsRef, {
        ...info,
        createdAt: now,
        lastActiveAt: now,
        serverTimestamp: serverTimestamp(),
    });

    return docRef.id;
}

/* ── Fetch all active sessions ── */

export async function fetchDeviceSessions(uid: string): Promise<DeviceSession[]> {
    if (!uid || !db) return [];

    const sessionsRef = collection(db, 'users', uid, 'sessions');
    const q = query(sessionsRef, orderBy('lastActiveAt', 'desc'), firestoreLimit(20));
    const snapshot = await getDocs(q);

    const currentFingerprint = typeof window !== 'undefined' ? generateSessionFingerprint() : '';

    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            device: data.device ?? 'Unknown',
            browser: data.browser ?? 'Unknown',
            os: data.os ?? 'Unknown',
            fingerprint: data.fingerprint ?? '',
            isCurrent: data.fingerprint === currentFingerprint,
            createdAt: data.createdAt ?? 0,
            lastActiveAt: data.lastActiveAt ?? 0,
            userAgent: data.userAgent ?? '',
            platform: data.platform ?? '',
            screenResolution: data.screenResolution ?? '',
            timezone: data.timezone ?? '',
            language: data.language ?? '',
        };
    });
}

/* ── Remove a device session (sign out remotely) ── */

export async function removeDeviceSession(uid: string, sessionId: string): Promise<void> {
    if (!uid || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
}

/* ── Remove all other sessions ── */

export async function removeAllOtherSessions(uid: string): Promise<number> {
    if (!uid || !db) return 0;

    const currentFingerprint = typeof window !== 'undefined' ? generateSessionFingerprint() : '';
    const sessionsRef = collection(db, 'users', uid, 'sessions');
    const snapshot = await getDocs(sessionsRef);
    let removed = 0;

    for (const d of snapshot.docs) {
        if (d.data().fingerprint !== currentFingerprint) {
            await deleteDoc(d.ref);
            removed++;
        }
    }

    return removed;
}

