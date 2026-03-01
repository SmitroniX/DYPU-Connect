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
import { Shield, Cookie, Lock, Fingerprint, ShieldCheck, ShieldAlert, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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
        <section className="dc-card p-6">
            <div className="flex items-center gap-3 mb-1">
                <Shield className="h-5 w-5 text-[var(--dc-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--dc-text-primary)]">Cookie &amp; Privacy</h2>
            </div>
            <p className="text-sm text-[var(--dc-text-muted)] mb-5">
                Manage cookie preferences and anti-sniffing protection.
            </p>

            {/* ── Anti-Sniffing Shield Panel ──────────────── */}
            <div className="mb-5 rounded-xl border border-[var(--dc-accent)]/15 bg-[var(--dc-accent-dim)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {sessionValid ? (
                            <ShieldCheck className="h-5 w-5 text-[var(--dc-accent)]" />
                        ) : (
                            <ShieldAlert className="h-5 w-5 text-[var(--dc-dnd)]" />
                        )}
                        <h3 className="text-sm font-bold text-[var(--dc-text-primary)]">Anti-Sniffing Shield</h3>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        sessionValid
                            ? 'bg-[var(--dc-accent-dim)] text-[var(--dc-accent)]'
                            : 'bg-red-500/15 text-[var(--dc-dnd)]'
                    }`}>
                        {sessionValid ? 'Protected' : 'Threat Detected'}
                    </span>
                </div>

                {/* Shield details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Session integrity */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--dc-bg-tertiary)] border border-[var(--dc-border)] px-3 py-2">
                        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${sessionValid ? 'text-[var(--dc-accent)]' : 'text-[var(--dc-dnd)]'}`} />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--dc-text-secondary)]">Session Integrity</p>
                            <p className={`text-[9px] ${sessionValid ? 'text-[var(--dc-accent)]' : 'text-[var(--dc-dnd)]'}`}>
                                {sessionValid ? 'Verified — no hijack detected' : sessionReason}
                            </p>
                        </div>
                    </div>

                    {/* Browser fingerprint */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--dc-bg-tertiary)] border border-[var(--dc-border)] px-3 py-2">
                        <Fingerprint className="h-3.5 w-3.5 text-[var(--dc-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--dc-text-secondary)]">Browser Fingerprint</p>
                            <p className="text-[9px] text-[var(--dc-accent)] font-mono">{fingerprint || '—'}</p>
                        </div>
                    </div>

                    {/* Cookie encryption */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--dc-bg-tertiary)] border border-[var(--dc-border)] px-3 py-2">
                        <Lock className="h-3.5 w-3.5 text-[var(--dc-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--dc-text-secondary)]">Encryption</p>
                            <p className="text-[9px] text-[var(--dc-accent)]">XOR cipher + HMAC signed</p>
                        </div>
                    </div>

                    {/* Active cookies */}
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--dc-bg-tertiary)] border border-[var(--dc-border)] px-3 py-2">
                        <Cookie className="h-3.5 w-3.5 text-[var(--dc-accent)] shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--dc-text-secondary)]">Active Cookies</p>
                            <p className="text-[9px] text-[var(--dc-accent)]">{cookieCount} cookie{cookieCount !== 1 ? 's' : ''} · Secure + SameSite=Strict</p>
                        </div>
                    </div>
                </div>

                {/* Shield actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                    <button
                        onClick={handleRevalidate}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dc-bg-tertiary)] border border-[var(--dc-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--dc-text-secondary)] hover:bg-[var(--dc-bg-hover)] hover:text-[var(--dc-text-primary)] transition-colors"
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
                <div className="text-[9px] text-[var(--dc-accent)]/50 leading-relaxed space-y-0.5 pt-1 border-t border-[var(--dc-border)]">
                    <p>✓ Cookies encrypted with browser-bound key</p>
                    <p>✓ HMAC signature prevents tampering</p>
                    <p>✓ Fingerprint binding blocks replay from other devices</p>
                    <p>✓ Session nonce rotates on every write</p>
                    <p>✓ HSTS preload forces HTTPS (no downgrade sniffing)</p>
                    <p>✓ CSP blocks XSS-based document.cookie theft</p>
                </div>
            </div>

            {/* ── Cookie Preferences ──────────────────────── */}
            <h3 className="text-sm font-semibold text-[var(--dc-text-primary)] mb-3">Cookie Preferences</h3>
            <div className="space-y-3">
                {/* Essential */}
                <div className="flex items-center justify-between rounded-lg border border-[var(--dc-border)] p-3">
                    <div className="flex items-center gap-2.5">
                        <Lock className="h-4 w-4 text-[var(--dc-accent)]" />
                        <div>
                            <span className="text-sm text-[var(--dc-text-primary)] font-medium">Essential cookies</span>
                            <p className="text-[10px] text-[var(--dc-text-muted)]">Auth, sessions, security. Always required.</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--dc-accent)] uppercase bg-[var(--dc-accent-dim)] px-2 py-0.5 rounded-full">Required</span>
                </div>

                {/* Analytics */}
                <label className="flex items-center justify-between rounded-lg border border-[var(--dc-border)] p-3 cursor-pointer hover:bg-[var(--dc-bg-hover)] transition-colors">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">📊</span>
                        <div>
                            <span className="text-sm text-[var(--dc-text-secondary)]">Analytics cookies</span>
                            <p className="text-[10px] text-[var(--dc-text-muted)]">Firebase Analytics &amp; performance monitoring.</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={analytics}
                        onChange={(e) => setAnalytics(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--dc-border)] text-[var(--dc-accent)] focus:ring-[var(--dc-accent)]/50"
                    />
                </label>

                {/* Functional */}
                <label className="flex items-center justify-between rounded-lg border border-[var(--dc-border)] p-3 cursor-pointer hover:bg-[var(--dc-bg-hover)] transition-colors">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">⚙️</span>
                        <div>
                            <span className="text-sm text-[var(--dc-text-secondary)]">Functional cookies</span>
                            <p className="text-[10px] text-[var(--dc-text-muted)]">Preferences, themes, compact mode.</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={functional}
                        onChange={(e) => setFunctional(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--dc-border)] text-[var(--dc-accent)] focus:ring-[var(--dc-accent)]/50"
                    />
                </label>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    onClick={handleSave}
                    className="rounded-md bg-[var(--dc-accent)] px-3 py-2 text-sm font-medium text-[var(--dc-bg-tertiary)] hover:bg-[var(--dc-accent-hover)] transition-colors"
                >
                    Save Preferences
                </button>
                <button
                    onClick={handleAcceptAll}
                    className="rounded-md border border-[var(--dc-border)] px-3 py-2 text-sm font-medium text-[var(--dc-text-secondary)] hover:bg-[var(--dc-bg-hover)] transition-colors"
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
                <p className="mt-3 text-[10px] text-[var(--dc-text-muted)]">
                    <Cookie className="inline h-3 w-3 mr-1" />
                    Last consented: {new Date(consent.consentedAt).toLocaleDateString()} · v{consent.version}
                </p>
            )}
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
            const token = await requestGoogleDriveAccessToken('consent');
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--dc-accent)]"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name="settings" description="Manage your app preferences and account" />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6 animate-[fade-in-up_0.3s_ease-out]">

                    <section className="dc-card p-6">
                        <h2 className="text-lg font-semibold text-[var(--dc-text-primary)]">Preferences</h2>
                        <div className="mt-4 space-y-3">
                            <label className="flex items-center justify-between rounded-lg border border-[var(--dc-border)] p-3">
                                <span className="text-sm text-[var(--dc-text-secondary)]">Email notifications</span>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifications}
                                    onChange={() => toggle('emailNotifications')}
                                    className="h-4 w-4 rounded border-[var(--dc-border)] text-[var(--dc-accent)] focus:ring-[var(--dc-accent)]/50"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-lg border border-[var(--dc-border)] p-3">
                                <span className="text-sm text-[var(--dc-text-secondary)]">Sound effects</span>
                                <input
                                    type="checkbox"
                                    checked={settings.soundEffects}
                                    onChange={() => toggle('soundEffects')}
                                    className="h-4 w-4 rounded border-[var(--dc-border)] text-[var(--dc-accent)] focus:ring-[var(--dc-accent)]/50"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-lg border border-[var(--dc-border)] p-3">
                                <span className="text-sm text-[var(--dc-text-secondary)]">Compact mode</span>
                                <input
                                    type="checkbox"
                                    checked={settings.compactMode}
                                    onChange={() => toggle('compactMode')}
                                    className="h-4 w-4 rounded border-[var(--dc-border)] text-[var(--dc-accent)] focus:ring-[var(--dc-accent)]/50"
                                />
                            </label>
                        </div>
                        <button
                            onClick={resetSettings}
                            className="mt-4 text-sm font-medium text-[var(--dc-accent)] hover:text-[var(--dc-accent-hover)] transition-colors"
                        >
                            Reset to default
                        </button>
                    </section>

                    <section className="dc-card p-6">
                        <h2 className="text-lg font-semibold text-[var(--dc-text-primary)]">Google Drive</h2>
                        <p className="mt-1 text-sm text-[var(--dc-text-muted)]">
                            Connect your Google account to upload profile media to your own Drive storage.
                        </p>

                        <div className="mt-4 rounded-lg border border-[var(--dc-border)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-[var(--dc-text-secondary)]">
                                        Status:{' '}
                                        <span className={`font-semibold ${userProfile.googleDrive ? 'text-[var(--dc-accent)]' : 'text-[var(--dc-text-muted)]'}`}>
                                            {userProfile.googleDrive ? 'Connected' : 'Not connected'}
                                        </span>
                                    </p>
                                    {userProfile.googleDrive?.email && (
                                        <p className="text-xs text-[var(--dc-text-muted)] mt-1">{userProfile.googleDrive.email}</p>
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
                                            className="rounded-md bg-[var(--dc-accent)] px-3 py-2 text-sm font-medium text-[var(--dc-bg-tertiary)] hover:bg-[var(--dc-accent-hover)] disabled:opacity-50 transition-colors"
                                        >
                                            Connect Google Drive
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <label htmlFor="driveFolder" className="block text-sm font-medium text-[var(--dc-text-secondary)]">
                                    Drive Folder Link (optional)
                                </label>
                                <input
                                    id="driveFolder"
                                    value={driveFolderLink}
                                    onChange={(e) => setDriveFolderLink(e.target.value)}
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="dc-input"
                                />
                                <button
                                    onClick={saveDriveFolder}
                                    disabled={driveBusy || !userProfile.googleDrive}
                                    className="rounded-md border border-[var(--dc-border)] px-3 py-2 text-sm font-medium text-[var(--dc-text-secondary)] hover:bg-[var(--dc-bg-hover)] disabled:opacity-50 transition-colors"
                                >
                                    Save Folder
                                </button>
                            </div>
                        </div>
                    </section>

                    <CookiePrivacySection />

                    <section className="dc-card p-6">
                        <h2 className="text-lg font-semibold text-[var(--dc-text-primary)]">Account</h2>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-[var(--dc-text-muted)]">Name</dt>
                                <dd className="text-[var(--dc-text-primary)] font-medium">{userProfile.name}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--dc-text-muted)]">Email</dt>
                                <dd className="text-[var(--dc-text-primary)] font-medium">{userProfile.email}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--dc-text-muted)]">Role</dt>
                                <dd className="text-[var(--dc-text-primary)] font-medium capitalize">{userProfile.role}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--dc-text-muted)]">Gender</dt>
                                <dd className="text-[var(--dc-text-primary)] font-medium capitalize">{userProfile.gender}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[var(--dc-text-muted)]">Account Type</dt>
                                <dd className="text-[var(--dc-text-primary)] font-medium capitalize">{userProfile.accountVisibility}</dd>
                            </div>
                        </dl>
                        <div className="mt-5">
                            <button
                                onClick={logout}
                                className="inline-flex items-center rounded-md bg-[var(--dc-dnd)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
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
