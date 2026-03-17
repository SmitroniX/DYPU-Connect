'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    extractGoogleDriveFolderId,
    fetchGoogleUserEmail,
    isGoogleDriveConfigured,
    requestGoogleDriveAccessToken,
    loadGoogleIdentityScript,
} from '@/lib/googleDrive';
import type { GoogleDriveConnection } from '@/types/profile';
import {
    type CookieConsent as CookieConsentType,
    getConsent,
    saveConsent,
    revokeConsent,
    acceptAllCookies,
} from '@/lib/cookies';
import {
    validateSessionIntegrity,
    panicWipeCookies,
} from '@/lib/cookieShield';
import { generateSessionFingerprint } from '@/lib/security';
import { Shield, Cookie, Lock, Fingerprint, ShieldCheck, ShieldAlert, Trash2, RefreshCw, KeyRound, Activity, Eye, Monitor, Smartphone, Laptop, Globe, X, LogOut, CloudUpload, Clock, CheckCircle2, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { fetchActivityLog, type ActivityLogEntry } from '@/lib/activityLog';
import { getOrCreateEncryptionSalt } from '@/lib/encryption';
import { fetchDeviceSessions, removeDeviceSession, removeAllOtherSessions, type DeviceSession } from '@/lib/deviceSessions';
import { formatDistanceToNowStrict } from 'date-fns';
import { type AutoBackupInterval, AUTO_BACKUP_INTERVALS } from '@/types/profile';
import { isAndroidApp, isBiometricAvailable, authenticateBiometric, registerAndroidEventListener } from '@/lib/android';

interface UserSettings {
    emailNotifications: boolean;
    soundEffects: boolean;
    compactMode: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
    emailNotifications: true,
    soundEffects: true,
    compactMode: false,
};

const SETTINGS_STORAGE_KEY = 'dypu_settings_v1';

function SecuritySection() {
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const [loginLogs, setLoginLogs] = useState<ActivityLogEntry[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('dypu_biometric_lock');
        setBiometricEnabled(stored === 'true');

        if (isAndroidApp()) {
            const unsubscribe = registerAndroidEventListener((event, data) => {
                if (event === 'biometric_auth_result') {
                    if (data === 'success') {
                        toast.success('Biometric lock confirmed');
                    } else {
                        setBiometricEnabled(false);
                        localStorage.setItem('dypu_biometric_lock', 'false');
                        toast.error('Authentication failed');
                    }
                }
            });
            return () => unsubscribe();
        }
    }, []);

    const toggleBiometric = () => {
        if (!isBiometricAvailable()) {
            toast.error('Biometric authentication not available on this device');
            return;
        }

        const next = !biometricEnabled;
        if (next) {
            authenticateBiometric('Enable App Lock', 'Confirm your identity to enable biometric lock');
            setBiometricEnabled(true);
            localStorage.setItem('dypu_biometric_lock', 'true');
        } else {
            setBiometricEnabled(false);
            localStorage.setItem('dypu_biometric_lock', 'false');
            toast.success('Biometric lock disabled');
        }
    };

    useEffect(() => {
        if (!user) return;
        setLoadingLogs(true);
        fetchActivityLog(user.uid, 20)
            .then((logs) => setLoginLogs(logs.filter((l) => l.action === 'login')))
            .catch(() => {})
            .finally(() => setLoadingLogs(false));
    }, [user]);

    const toggleEncryption = async () => {
        if (!user || !userProfile || toggling) return;
        setToggling(true);
        try {
            const newState = !userProfile.encryptionEnabled;
            const updates: Record<string, unknown> = { encryptionEnabled: newState };

            if (newState && !userProfile.encryptionSalt) {
                const salt = await getOrCreateEncryptionSalt(user.uid);
                updates.encryptionSalt = salt;
            }

            const { updateDoc, doc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            await updateDoc(doc(db, 'users', user.uid), updates);
            setUserProfile({ ...userProfile, ...updates as Partial<typeof userProfile> });
            toast.success(newState ? 'Drive encryption enabled. New uploads will be encrypted.' : 'Drive encryption disabled.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to toggle encryption.');
        } finally {
            setToggling(false);
        }
    };

    const fingerprint = generateSessionFingerprint();

    return (
        <section className="surface p-6">
            <div className="flex items-center gap-3 mb-1">
                <KeyRound className="h-5 w-5 text-[var(--ui-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--ui-text)]">Security</h2>
            </div>
            <p className="text-sm text-[var(--ui-text-muted)] mb-5">
                Manage encryption, review login activity, and monitor your session.
            </p>

            {/* ── Biometric Lock Toggle (Android Only) ── */}
            {isAndroidApp() && (
                <div className="mb-5 rounded-xl border border-[var(--ui-accent)]/15 bg-[var(--ui-accent-dim)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Fingerprint className="h-5 w-5 text-[var(--ui-accent)]" />
                            <h3 className="text-sm font-bold text-[var(--ui-text)]">Biometric App Lock</h3>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={biometricEnabled}
                                onChange={toggleBiometric}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[var(--ui-bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ui-accent)]"></div>
                        </label>
                    </div>
                    <p className="text-[11px] text-[var(--ui-text-muted)]">
                        When enabled, the app will require fingerprint or face authentication every time you open it to protect your privacy.
                    </p>
                    {!isBiometricAvailable() && (
                        <p className="text-[11px] text-[var(--ui-warning)]">Biometrics not supported or not set up on this device.</p>
                    )}
                </div>
            )}

            {/* ── Drive Encryption Toggle ── */}
            <div className="mb-5 rounded-xl border border-[var(--ui-accent)]/15 bg-[var(--ui-accent-dim)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-[var(--ui-accent)]" />
                        <h3 className="text-sm font-bold text-[var(--ui-text)]">Drive Encryption (AES-256-GCM)</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!userProfile?.encryptionEnabled}
                            onChange={toggleEncryption}
                            disabled={toggling || !userProfile?.googleDrive}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[var(--ui-bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ui-accent)]"></div>
                    </label>
                </div>
                <p className="text-[11px] text-[var(--ui-text-muted)]">
                    When enabled, new uploads to Google Drive are encrypted client-side with AES-256-GCM before leaving your browser.
                    Your encryption key is derived from your account and never leaves the device.
                </p>
                {!userProfile?.googleDrive && (
                    <p className="text-[11px] text-[var(--ui-warning)]">Connect Google Drive first to enable encryption.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Lock className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Algorithm</p>
                            <p className="text-[9px] text-[var(--ui-accent)]">AES-256-GCM + PBKDF2 key derivation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Shield className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Status</p>
                            <p className={`text-[9px] ${userProfile?.encryptionEnabled ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)]'}`}>
                                {userProfile?.encryptionEnabled ? '🔒 Active — new uploads encrypted' : '🔓 Disabled — uploads in plaintext'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Active Session ── */}
            <div className="mb-5 rounded-xl border border-[var(--ui-border)] p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-[var(--ui-accent)]" />
                    <h3 className="text-sm font-semibold text-[var(--ui-text)]">Current Session</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Fingerprint className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Session Fingerprint</p>
                            <p className="text-[9px] text-[var(--ui-accent)] font-mono">{fingerprint || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Eye className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Browser</p>
                            <p className="text-[9px] text-[var(--ui-accent)]">{typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Login Activity ── */}
            <div className="rounded-xl border border-[var(--ui-border)] p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-[var(--ui-accent)]" />
                    <h3 className="text-sm font-semibold text-[var(--ui-text)]">Recent Logins</h3>
                </div>
                {loadingLogs ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                    </div>
                ) : loginLogs.length === 0 ? (
                    <p className="text-xs text-[var(--ui-text-muted)] py-4 text-center">No login activity recorded yet.</p>
                ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {loginLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between rounded-lg bg-[var(--ui-bg-elevated)] px-3 py-2 text-[11px]">
                                <span className="text-[var(--ui-text-secondary)]">{log.details}</span>
                                <span className="text-[var(--ui-text-muted)] shrink-0 ml-2">
                                    {formatDistanceToNowStrict(new Date(log.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ── Logged-in Devices Section ───────────────────── */

function DeviceSessionsSection() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<DeviceSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [removingAll, setRemovingAll] = useState(false);

    const loadSessions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await fetchDeviceSessions(user.uid);
            setSessions(data);
        } catch {
            toast.error('Failed to load device sessions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleRemove = async (sessionId: string) => {
        if (!user) return;
        setRemovingId(sessionId);
        try {
            await removeDeviceSession(user.uid, sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            toast.success('Device session removed.');
        } catch {
            toast.error('Failed to remove session.');
        } finally {
            setRemovingId(null);
        }
    };

    const handleRemoveAll = async () => {
        if (!user) return;
        setRemovingAll(true);
        try {
            const count = await removeAllOtherSessions(user.uid);
            setSessions((prev) => prev.filter((s) => s.isCurrent));
            toast.success(`Signed out of ${count} other device${count !== 1 ? 's' : ''}.`);
        } catch {
            toast.error('Failed to remove other sessions.');
        } finally {
            setRemovingAll(false);
        }
    };

    const getDeviceIcon = (device: string) => {
        const d = device.toLowerCase();
        if (d.includes('iphone') || d.includes('android phone')) return <Smartphone className="h-5 w-5" />;
        if (d.includes('ipad') || d.includes('tablet')) return <Smartphone className="h-5 w-5" />;
        if (d.includes('mac') || d.includes('laptop')) return <Laptop className="h-5 w-5" />;
        return <Monitor className="h-5 w-5" />;
    };

    const otherSessions = sessions.filter((s) => !s.isCurrent);

    return (
        <section className="surface p-6">
            <div className="flex items-center gap-3 mb-1">
                <Monitor className="h-5 w-5 text-[var(--ui-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--ui-text)]">Logged-in Devices</h2>
            </div>
            <p className="text-sm text-[var(--ui-text-muted)] mb-5">
                Manage devices where your account is currently active. Remove any you don&apos;t recognize.
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                </div>
            ) : sessions.length === 0 ? (
                <p className="text-xs text-[var(--ui-text-muted)] py-6 text-center">No device sessions recorded yet.</p>
            ) : (
                <div className="space-y-3">
                    {/* Current device */}
                    {sessions.filter((s) => s.isCurrent).map((session) => (
                        <div
                            key={session.id}
                            className="rounded-xl border-2 border-[var(--ui-accent)]/30 bg-[var(--ui-accent-dim)] p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--ui-accent)]/15 text-[var(--ui-accent)]">
                                    {getDeviceIcon(session.device)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="text-sm font-bold text-[var(--ui-text)]">{session.device}</h4>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent)] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                            This device
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--ui-text-secondary)]">{session.browser}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                        <span className="text-[10px] text-[var(--ui-text-muted)] flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> {session.os}
                                        </span>
                                        <span className="text-[10px] text-[var(--ui-text-muted)]">
                                            🖥️ {session.screenResolution}
                                        </span>
                                        <span className="text-[10px] text-[var(--ui-text-muted)]">
                                            🌐 {session.timezone}
                                        </span>
                                        <span className="text-[10px] text-[var(--ui-text-muted)]">
                                            🗣️ {session.language}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[var(--ui-text-muted)] mt-1">
                                        Active {formatDistanceToNowStrict(new Date(session.lastActiveAt), { addSuffix: true })}
                                        {session.createdAt !== session.lastActiveAt && (
                                            <> · First seen {formatDistanceToNowStrict(new Date(session.createdAt), { addSuffix: true })}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Other devices */}
                    {otherSessions.length > 0 && (
                        <div className="flex items-center justify-between pt-2 pb-1">
                            <p className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">
                                Other Devices ({otherSessions.length})
                            </p>
                            <button
                                onClick={handleRemoveAll}
                                disabled={removingAll}
                                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--ui-danger)] hover:text-[var(--ui-danger)]/80 disabled:opacity-50 transition-colors"
                            >
                                {removingAll ? (
                                    <div className="h-3 w-3 rounded-full border border-[var(--ui-danger)]/30 border-t-[var(--ui-danger)] animate-spin" />
                                ) : (
                                    <LogOut className="h-3 w-3" />
                                )}
                                Sign out all other devices
                            </button>
                        </div>
                    )}

                    {otherSessions.map((session) => (
                        <div
                            key={session.id}
                            className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--ui-bg-surface)] text-[var(--ui-text-muted)]">
                                    {getDeviceIcon(session.device)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-[var(--ui-text)]">{session.device}</h4>
                                    <p className="text-xs text-[var(--ui-text-secondary)]">{session.browser}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                        <span className="text-[10px] text-[var(--ui-text-muted)] flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> {session.os}
                                        </span>
                                        <span className="text-[10px] text-[var(--ui-text-muted)]">
                                            🖥️ {session.screenResolution}
                                        </span>
                                        <span className="text-[10px] text-[var(--ui-text-muted)]">
                                            🌐 {session.timezone}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[var(--ui-text-muted)] mt-1">
                                        Last active {formatDistanceToNowStrict(new Date(session.lastActiveAt), { addSuffix: true })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRemove(session.id)}
                                    disabled={removingId === session.id}
                                    className="flex-shrink-0 p-2 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] hover:bg-[var(--ui-danger)]/10 disabled:opacity-50 transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove this device"
                                >
                                    {removingId === session.id ? (
                                        <div className="h-4 w-4 rounded-full border-2 border-[var(--ui-danger)]/30 border-t-[var(--ui-danger)] animate-spin" />
                                    ) : (
                                        <X className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Refresh button */}
                    <button
                        onClick={loadSessions}
                        disabled={loading}
                        className="flex items-center gap-2 mx-auto mt-2 text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            )}
        </section>
    );
}

/* ── Cookie & Privacy Management Section ─────────── */

function CookiePrivacySection() {
    const [consent, setConsentState] = useState<CookieConsentType | null>(null);
    const [analytics, setAnalytics] = useState(true);
    const [functional, setFunctional] = useState(true);
    const [loaded, setLoaded] = useState(false);

    // Anti-sniffing shield state
    const [sessionValid, setSessionValid] = useState<boolean | null>(null);
    const [sessionReason, setSessionReason] = useState<string>('');
    const [fingerprint, setFingerprint] = useState('');
    const [cookieCount, setCookieCount] = useState(0);

    useEffect(() => {
        const current = getConsent();
        // Batch all initial state in a single tick via queueMicrotask
        queueMicrotask(() => {
            setConsentState(current);
            if (current) {
                setAnalytics(current.analytics);
                setFunctional(current.functional);
            }

            // Run shield checks
            const result = validateSessionIntegrity();
            setSessionValid(result.valid);
            setSessionReason(result.reason || '');
            setFingerprint(generateSessionFingerprint());
            setCookieCount(document.cookie.split(';').filter(c => c.trim()).length);

            setLoaded(true);
        });
    }, []);

    const handleSave = () => {
        const updated = saveConsent({ analytics, functional });
        setConsentState(updated);
        toast.success('Cookie preferences updated.');
    };

    const handleAcceptAll = () => {
        const updated = acceptAllCookies();
        setConsentState(updated);
        setAnalytics(true);
        setFunctional(true);
        toast.success('All cookies accepted.');
    };

    const handleRevoke = () => {
        revokeConsent();
        setConsentState(null);
        setAnalytics(true);
        setFunctional(true);
        toast.success('Cookie consent revoked. Banner will reappear on next page load.');
    };

    const handlePanicWipe = () => {
        panicWipeCookies();
        setConsentState(null);
        setCookieCount(0);
        toast.success('All cookies wiped. You may be signed out.', { icon: '🛡️', duration: 4000 });
    };

    const handleRevalidate = () => {
        const result = validateSessionIntegrity();
        setSessionValid(result.valid);
        setSessionReason(result.reason || '');
        setFingerprint(generateSessionFingerprint());
        setCookieCount(document.cookie.split(';').filter(c => c.trim()).length);
        toast.success(result.valid ? 'Session verified — no threats detected.' : 'Session integrity issue detected!', {
            icon: result.valid ? '✅' : '⚠️',
        });
    };

    if (!loaded) return null;

    return (
        <section className="surface p-6">
            <div className="flex items-center gap-3 mb-1">
                <Shield className="h-5 w-5 text-[var(--ui-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--ui-text)]">Cookie &amp; Privacy</h2>
            </div>
            <p className="text-sm text-[var(--ui-text-muted)] mb-5">
                Manage cookie preferences and anti-sniffing protection.
            </p>

            {/* ── Anti-Sniffing Shield Panel ──────────────── */}
            <div className="mb-5 rounded-xl border border-[var(--ui-accent)]/15 bg-[var(--ui-accent-dim)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {sessionValid ? (
                            <ShieldCheck className="h-5 w-5 text-[var(--ui-accent)]" />
                        ) : (
                            <ShieldAlert className="h-5 w-5 text-[var(--ui-danger)]" />
                        )}
                        <h3 className="text-sm font-bold text-[var(--ui-text)]">Anti-Sniffing Shield</h3>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        sessionValid
                            ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)]'
                            : 'bg-red-500/15 text-[var(--ui-danger)]'
                    }`}>
                        {sessionValid ? 'Protected' : 'Threat Detected'}
                    </span>
                </div>

                {/* Shield details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Session integrity */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${sessionValid ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-danger)]'}`} />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Session Integrity</p>
                            <p className={`text-[9px] ${sessionValid ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-danger)]'}`}>
                                {sessionValid ? 'Verified — no hijack detected' : sessionReason}
                            </p>
                        </div>
                    </div>

                    {/* Browser fingerprint */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Fingerprint className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Browser Fingerprint</p>
                            <p className="text-[9px] text-[var(--ui-accent)] font-mono">{fingerprint || '—'}</p>
                        </div>
                    </div>

                    {/* Cookie encryption */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Lock className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Encryption</p>
                            <p className="text-[9px] text-[var(--ui-accent)]">XOR cipher + HMAC signed</p>
                        </div>
                    </div>

                    {/* Active cookies */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-2">
                        <Cookie className="h-3.5 w-3.5 text-[var(--ui-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Active Cookies</p>
                            <p className="text-[9px] text-[var(--ui-accent)]">{cookieCount} cookie{cookieCount !== 1 ? 's' : ''} · Secure + SameSite=Strict</p>
                        </div>
                    </div>
                </div>

                {/* Shield actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                    <button
                        onClick={handleRevalidate}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] transition-colors"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Re-validate Session
                    </button>
                    <button
                        onClick={handlePanicWipe}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-all"
                    >
                        <Trash2 className="h-3 w-3" />
                        Panic Wipe All Cookies
                    </button>
                </div>

                {/* Protection list */}
                <div className="text-[9px] text-[var(--ui-accent)]/50 leading-relaxed space-y-0.5 pt-1 border-t border-[var(--ui-border)]">
                    <p>✓ Cookies encrypted with browser-bound key</p>
                    <p>✓ HMAC signature prevents tampering</p>
                    <p>✓ Fingerprint binding blocks replay from other devices</p>
                    <p>✓ Session nonce rotates on every write</p>
                    <p>✓ HSTS preload forces HTTPS (no downgrade sniffing)</p>
                    <p>✓ CSP blocks XSS-based document.cookie theft</p>
                </div>
            </div>

            {/* ── Cookie Preferences ──────────────────────── */}
            <h3 className="text-sm font-semibold text-[var(--ui-text)] mb-3">Cookie Preferences</h3>
            <div className="space-y-3">
                {/* Essential */}
                <div className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3">
                    <div className="flex items-center gap-2.5">
                        <Lock className="h-4 w-4 text-[var(--ui-accent)]" />
                        <div>
                            <span className="text-sm text-[var(--ui-text)] font-medium">Essential cookies</span>
                            <p className="text-[10px] text-[var(--ui-text-muted)]">Auth, sessions, security. Always required.</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--ui-accent)] uppercase bg-[var(--ui-accent-dim)] px-2 py-0.5 rounded-full">Required</span>
                </div>

                {/* Analytics */}
                <label className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3 cursor-pointer hover:bg-[var(--ui-bg-hover)] transition-colors">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">📊</span>
                        <div>
                            <span className="text-sm text-[var(--ui-text-secondary)]">Analytics cookies</span>
                            <p className="text-[10px] text-[var(--ui-text-muted)]">Firebase Analytics &amp; performance monitoring.</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={analytics}
                        onChange={(e) => setAnalytics(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--ui-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]/50"
                    />
                </label>

                {/* Functional */}
                <label className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3 cursor-pointer hover:bg-[var(--ui-bg-hover)] transition-colors">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">⚙️</span>
                        <div>
                            <span className="text-sm text-[var(--ui-text-secondary)]">Functional cookies</span>
                            <p className="text-[10px] text-[var(--ui-text-muted)]">Preferences, themes, compact mode.</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={functional}
                        onChange={(e) => setFunctional(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--ui-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]/50"
                    />
                </label>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    onClick={handleSave}
                    className="rounded-md bg-[var(--ui-accent)] px-3 py-2 text-sm font-medium text-[var(--ui-bg-elevated)] hover:bg-[var(--ui-accent-hover)] transition-colors"
                >
                    Save Preferences
                </button>
                <button
                    onClick={handleAcceptAll}
                    className="rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                >
                    Accept All
                </button>
                {consent && (
                    <button
                        onClick={handleRevoke}
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                    >
                        Revoke Consent
                    </button>
                )}
            </div>

            {consent && (
                <p className="mt-3 text-[10px] text-[var(--ui-text-muted)]">
                    <Cookie className="inline h-3 w-3 mr-1" />
                    Last consented: {new Date(consent.consentedAt).toLocaleDateString()} · v{consent.version}
                </p>
            )}
        </section>
    );
}

/* ── Auto Backup Section ─────────────────────────── */

function AutoBackupSection() {
    const { user } = useAuth();
    const { userProfile, setUserProfile, driveAccessToken, setDriveAccessToken } = useStore();
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [enabled, setEnabled] = useState(userProfile?.autoBackup?.enabled ?? false);
    const [interval, setInterval] = useState<AutoBackupInterval>(userProfile?.autoBackup?.interval ?? '24h');

    const lastBackupAt = userProfile?.autoBackup?.lastBackupAt;
    const lastBackupFile = userProfile?.autoBackup?.lastBackupFile;
    const driveConnected = !!userProfile?.googleDrive;

    const saveSettings = async () => {
        if (!user || !userProfile || saving) return;
        setSaving(true);
        try {
            const autoBackup = {
                enabled,
                interval,
                lastBackupAt: userProfile.autoBackup?.lastBackupAt ?? undefined,
                lastBackupFile: userProfile.autoBackup?.lastBackupFile ?? undefined,
            };
            await updateDoc(doc(db, 'users', user.uid), { autoBackup });
            setUserProfile({ ...userProfile, autoBackup });
            toast.success('Auto-backup settings saved.');
        } catch {
            toast.error('Failed to save backup settings.');
        } finally {
            setSaving(false);
        }
    };

    const runBackupNow = async () => {
        if (!user || !userProfile || backingUp) return;
        if (!driveConnected) {
            toast.error('Connect Google Drive first.');
            return;
        }
        setBackingUp(true);
        try {
            const { exportProfileBackup } = await import('@/lib/backup');

            let fileName: string;
            try {
                fileName = await exportProfileBackup(userProfile, driveAccessToken);
            } catch {
                // Token may be expired — clear it and retry with a fresh one
                setDriveAccessToken(null);
                fileName = await exportProfileBackup(userProfile, null);
            }

            const now = Date.now();
            const autoBackup = { ...userProfile.autoBackup, enabled, interval, lastBackupAt: now, lastBackupFile: fileName };
            await updateDoc(doc(db, 'users', user.uid), { autoBackup });
            setUserProfile({ ...userProfile, autoBackup });
            toast.success(`Backup saved: ${fileName}`);
        } catch (err) {
            // Clear stale token on any failure
            setDriveAccessToken(null);
            toast.error(err instanceof Error ? err.message : 'Backup failed.');
        } finally {
            setBackingUp(false);
        }
    };

    const nextBackupMs = (() => {
        if (!enabled || !lastBackupAt) return null;
        const intervalMs = AUTO_BACKUP_INTERVALS.find((i) => i.value === interval)?.ms ?? AUTO_BACKUP_INTERVALS[0].ms;
        return lastBackupAt + intervalMs;
    })();

    return (
        <section className="surface p-6">
            <div className="flex items-center gap-3 mb-1">
                <CloudUpload className="h-5 w-5 text-[var(--ui-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--ui-text)]">Auto Backup</h2>
            </div>
            <p className="text-sm text-[var(--ui-text-muted)] mb-5">
                Automatically back up your profile data to your @dypatil.edu Google Drive at regular intervals.
            </p>

            {!driveConnected && (
                <div className="mb-4 rounded-lg border border-[var(--ui-warning)]/30 bg-[var(--ui-warning)]/5 px-4 py-3">
                    <p className="text-xs text-[var(--ui-warning)] font-medium">
                        ⚠ Connect Google Drive first to enable auto-backup.
                    </p>
                </div>
            )}

            {/* Enable toggle */}
            <div className="rounded-xl border border-[var(--ui-border)] p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CloudUpload className="h-4 w-4 text-[var(--ui-accent)]" />
                        <span className="text-sm font-medium text-[var(--ui-text)]">Enable Auto Backup</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => setEnabled(!enabled)}
                            disabled={!driveConnected}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[var(--ui-bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ui-accent)]"></div>
                    </label>
                </div>

                {/* Interval selector */}
                <div>
                    <label className="block text-xs font-semibold text-[var(--ui-text-secondary)] mb-2">
                        <Clock className="inline h-3.5 w-3.5 mr-1" />
                        Backup Frequency
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {AUTO_BACKUP_INTERVALS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setInterval(opt.value)}
                                disabled={!driveConnected}
                                className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                                    interval === opt.value
                                        ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20'
                                        : 'border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text-secondary)]'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                {opt.label}
                                {opt.value === '24h' && (
                                    <span className="block text-[9px] font-normal mt-0.5 opacity-60">Default</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status panel */}
                <div className="rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${lastBackupAt ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)]'}`} />
                        <span className="text-[var(--ui-text-secondary)] font-medium">Last backup:</span>
                        <span className="text-[var(--ui-text-muted)]">
                            {lastBackupAt
                                ? `${formatDistanceToNowStrict(new Date(lastBackupAt), { addSuffix: true })}`
                                : 'Never'}
                        </span>
                    </div>
                    {lastBackupFile && (
                        <p className="text-[10px] text-[var(--ui-text-muted)] font-mono truncate pl-5">
                            📄 {lastBackupFile}
                        </p>
                    )}
                    {nextBackupMs && enabled && (
                        <div className="flex items-center gap-2 text-xs pl-5">
                            <Clock className="h-3 w-3 text-[var(--ui-text-muted)]" />
                            <span className="text-[var(--ui-text-muted)]">
                                Next backup: {nextBackupMs > Date.now()
                                    ? formatDistanceToNowStrict(new Date(nextBackupMs), { addSuffix: true })
                                    : 'Due now (will run automatically)'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                    <button
                        onClick={saveSettings}
                        disabled={saving || !driveConnected}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ui-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {saving ? (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                            <CloudUpload className="h-3.5 w-3.5" />
                        )}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                        onClick={runBackupNow}
                        disabled={backingUp || !driveConnected}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ui-border)] px-4 py-2 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] disabled:opacity-50 transition-colors"
                    >
                        {backingUp ? (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {backingUp ? 'Backing up...' : 'Backup Now'}
                    </button>
                </div>

                <p className="text-[10px] text-[var(--ui-text-muted)] leading-relaxed">
                    Backups are saved as JSON files to your connected Google Drive. They include your profile, gallery, highlights, and settings.
                    Auto-backup runs silently in the background while the app is open.
                </p>
            </div>
        </section>
    );
}

export default function SettingsPage() {
    const { user, loading, logout } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const router = useRouter();
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [initialized, setInitialized] = useState(false);
    const [driveFolderLink, setDriveFolderLink] = useState('');
    const [driveBusy, setDriveBusy] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (!userProfile) {
            router.replace('/setup-profile');
        }
    }, [loading, router, user, userProfile]);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<UserSettings>;
                setSettings({
                    emailNotifications: parsed.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications,
                    soundEffects: parsed.soundEffects ?? DEFAULT_SETTINGS.soundEffects,
                    compactMode: parsed.compactMode ?? DEFAULT_SETTINGS.compactMode,
                });
            }
        } catch {
            toast.error('Failed to load saved settings.');
        } finally {
            setInitialized(true);
        }
    }, []);

    useEffect(() => {
        if (!initialized) return;
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        
        // Preload Google Identity script so that popup doesn't get blocked later
        if (isGoogleDriveConfigured()) {
            loadGoogleIdentityScript().catch(() => { /* ignore */ });
        }
    }, [initialized, settings]);

    useEffect(() => {
        if (!userProfile?.googleDrive) {
            setDriveFolderLink('');
            return;
        }

        const fallbackFolderLink = userProfile.googleDrive.folderId
            ? `https://drive.google.com/drive/folders/${userProfile.googleDrive.folderId}`
            : '';

        setDriveFolderLink(userProfile.googleDrive.folderLink || fallbackFolderLink);
    }, [userProfile?.googleDrive]);

    const toggle = (key: keyof UserSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        toast.success('Settings reset to default.');
    };

    const buildDriveConnection = (base: GoogleDriveConnection, folderInput: string): GoogleDriveConnection => {
        const trimmed = folderInput.trim();
        const folderId = extractGoogleDriveFolderId(trimmed);

        return {
            email: base.email,
            connectedAt: base.connectedAt,
            ...(folderId ? { folderId } : {}),
            ...(trimmed ? { folderLink: trimmed } : {}),
        };
    };

    const connectGoogleDrive = async () => {
        if (!user || !userProfile) return;
        if (!isGoogleDriveConfigured()) {
            toast.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local');
            return;
        }
        if (driveFolderLink.trim() && !extractGoogleDriveFolderId(driveFolderLink)) {
            toast.error('Enter a valid Google Drive folder link or ID.');
            return;
        }

        setDriveBusy(true);
        try {
            let token: string;
            try { token = await requestGoogleDriveAccessToken(''); }
            catch { token = await requestGoogleDriveAccessToken('consent'); }
            const googleEmail = await fetchGoogleUserEmail(token);

            const connection = buildDriveConnection(
                {
                    email: googleEmail,
                    connectedAt: Date.now(),
                },
                driveFolderLink
            );

            await updateDoc(doc(db, 'users', user.uid), {
                googleDrive: connection,
            });

            setUserProfile({
                ...userProfile,
                googleDrive: connection,
            });
            toast.success('Google Drive connected.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Google Drive connection failed.';
            toast.error(message);
        } finally {
            setDriveBusy(false);
        }
    };

    const saveDriveFolder = async () => {
        if (!user || !userProfile?.googleDrive) return;

        const trimmed = driveFolderLink.trim();
        if (trimmed && !extractGoogleDriveFolderId(trimmed)) {
            toast.error('Enter a valid Google Drive folder link or ID.');
            return;
        }

        setDriveBusy(true);
        try {
            const nextConnection = buildDriveConnection(userProfile.googleDrive, driveFolderLink);
            await updateDoc(doc(db, 'users', user.uid), {
                googleDrive: nextConnection,
            });
            setUserProfile({
                ...userProfile,
                googleDrive: nextConnection,
            });
            toast.success('Google Drive folder updated.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save Drive folder.';
            toast.error(message);
        } finally {
            setDriveBusy(false);
        }
    };

    const disconnectGoogleDrive = async () => {
        if (!user || !userProfile) return;

        setDriveBusy(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                googleDrive: deleteField(),
            });

            setUserProfile({
                ...userProfile,
                googleDrive: undefined,
            });
            setDriveFolderLink('');
            toast.success('Google Drive disconnected.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to disconnect Google Drive.';
            toast.error(message);
        } finally {
            setDriveBusy(false);
        }
    };

    if (loading || !userProfile) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ui-accent)]"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name="settings" description="Manage your app preferences and account" />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6 animate-[fade-in-up_0.3s_ease-out]">

                    <section className="surface p-6">
                        <h2 className="text-lg font-semibold text-[var(--ui-text)]">Preferences</h2>
                        
                        <div className="mt-4 mb-5">
                            <Link href="/settings/notifications" className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-4 bg-[var(--ui-bg-elevated)] transition-colors hover:border-[var(--ui-accent)]/50 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] rounded-lg">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm text-[var(--ui-text)] group-hover:text-[var(--ui-accent)] transition-colors">Advanced Notifications</h3>
                                        <p className="text-xs text-[var(--ui-text-muted)] mt-0.5">Manage push notifications, mentions, and alerts.</p>
                                    </div>
                                </div>
                                <div className="shrink-0 p-2 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-accent)] transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </Link>
                        </div>

                        <div className="mt-4 space-y-3">
                            <label className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3">
                                <span className="text-sm text-[var(--ui-text-secondary)]">Email notifications</span>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifications}
                                    onChange={() => toggle('emailNotifications')}
                                    className="h-4 w-4 rounded border-[var(--ui-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]/50"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3">
                                <span className="text-sm text-[var(--ui-text-secondary)]">Sound effects</span>
                                <input
                                    type="checkbox"
                                    checked={settings.soundEffects}
                                    onChange={() => toggle('soundEffects')}
                                    className="h-4 w-4 rounded border-[var(--ui-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]/50"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3">
                                <span className="text-sm text-[var(--ui-text-secondary)]">Compact mode</span>
                                <input
                                    type="checkbox"
                                    checked={settings.compactMode}
                                    onChange={() => toggle('compactMode')}
                                    className="h-4 w-4 rounded border-[var(--ui-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]/50"
                                />
                            </label>
                        </div>
                        <button
                            onClick={resetSettings}
                            className="mt-4 text-sm font-medium text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] transition-colors"
                        >
                            Reset to default
                        </button>
                    </section>

                    <section className="surface p-6">
                        <h2 className="text-lg font-semibold text-[var(--ui-text)]">Google Drive</h2>
                        <p className="mt-1 text-sm text-[var(--ui-text-muted)]">
                            Your Google Drive is used to store profile media (photos, stories, gallery). It auto-connects when you sign in with Google.
                        </p>

                        <div className="mt-4 rounded-lg border border-[var(--ui-border)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-[var(--ui-text-secondary)]">
                                        Status:{' '}
                                        <span className={`font-semibold ${userProfile.googleDrive ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)]'}`}>
                                            {userProfile.googleDrive ? 'Connected' : 'Not connected'}
                                        </span>
                                    </p>
                                    {userProfile.googleDrive?.email && (
                                        <p className="text-xs text-[var(--ui-text-muted)] mt-1">
                                            {userProfile.googleDrive.email}
                                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-dim)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
                                                ✓ Auto-connected via Google Sign-In
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {userProfile.googleDrive ? (
                                        <button
                                            onClick={disconnectGoogleDrive}
                                            disabled={driveBusy}
                                            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={connectGoogleDrive}
                                            disabled={driveBusy}
                                            className="rounded-md bg-[var(--ui-accent)] px-3 py-2 text-sm font-medium text-[var(--ui-bg-elevated)] hover:bg-[var(--ui-accent-hover)] disabled:opacity-50 transition-colors"
                                        >
                                            Connect Google Drive
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <label htmlFor="driveFolder" className="block text-sm font-medium text-[var(--ui-text-secondary)]">
                                    Drive Folder Link (optional)
                                </label>
                                <input
                                    id="driveFolder"
                                    value={driveFolderLink}
                                    onChange={(e) => setDriveFolderLink(e.target.value)}
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="input"
                                />
                                <button
                                    onClick={saveDriveFolder}
                                    disabled={driveBusy || !userProfile.googleDrive}
                                    className="rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] disabled:opacity-50 transition-colors"
                                >
                                    Save Folder
                                </button>
                            </div>
                        </div>
                    </section>

                    <AutoBackupSection />

                    <SecuritySection />

                    <DeviceSessionsSection />

                    <CookiePrivacySection />

                    <section className="surface p-6">
                        <h2 className="text-lg font-semibold text-[var(--ui-text)]">Account</h2>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-[var(--ui-text-muted)]">Name</dt>
                                <dd className="text-[var(--ui-text)] font-medium">{userProfile.name}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--ui-text-muted)]">Email</dt>
                                <dd className="text-[var(--ui-text)] font-medium">{userProfile.email}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--ui-text-muted)]">Role</dt>
                                <dd className="text-[var(--ui-text)] font-medium capitalize">{userProfile.role}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--ui-text-muted)]">Gender</dt>
                                <dd className="text-[var(--ui-text)] font-medium capitalize">{userProfile.gender}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--ui-text-muted)]">Account Type</dt>
                                <dd className="text-[var(--ui-text)] font-medium capitalize">{userProfile.accountVisibility}</dd>
                            </div>
                        </dl>
                        <div className="mt-5">
                            <button
                                onClick={logout}
                                className="inline-flex items-center rounded-md bg-[var(--ui-danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                            >
                                Logout
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
