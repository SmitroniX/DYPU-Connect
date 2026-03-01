'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
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
import { Shield, Cookie, Lock } from 'lucide-react';
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

    useEffect(() => {
        const current = getConsent();
        setConsentState(current);
        if (current) {
            setAnalytics(current.analytics);
            setFunctional(current.functional);
        }
        setLoaded(true);
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

    if (!loaded) return null;

    return (
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
                <Shield className="h-5 w-5 text-sky-300" />
                <h2 className="text-lg font-semibold text-white">Cookie &amp; Privacy</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
                Manage cookie preferences. All cookies use Secure + SameSite=Strict attributes.
            </p>

            <div className="space-y-3">
                {/* Essential */}
                <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <div className="flex items-center gap-2.5">
                        <Lock className="h-4 w-4 text-sky-300" />
                        <div>
                            <span className="text-sm text-white font-medium">Essential cookies</span>
                            <p className="text-[10px] text-slate-500">Auth, sessions, security. Always required.</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-sky-300 uppercase bg-sky-300/10 px-2 py-0.5 rounded-full">Required</span>
                </div>

                {/* Analytics */}
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">📊</span>
                        <div>
                            <span className="text-sm text-slate-300">Analytics cookies</span>
                            <p className="text-[10px] text-slate-500">Firebase Analytics &amp; performance monitoring.</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={analytics}
                        onChange={(e) => setAnalytics(e.target.checked)}
                        className="h-4 w-4 rounded border-white/10 text-sky-300 focus:ring-sky-300/50"
                    />
                </label>

                {/* Functional */}
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm">⚙️</span>
                        <div>
                            <span className="text-sm text-slate-300">Functional cookies</span>
                            <p className="text-[10px] text-slate-500">Preferences, themes, compact mode.</p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={functional}
                        onChange={(e) => setFunctional(e.target.checked)}
                        className="h-4 w-4 rounded border-white/10 text-sky-300 focus:ring-sky-300/50"
                    />
                </label>
            </div>

            {/* Status + Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    onClick={handleSave}
                    className="rounded-md bg-linear-to-r from-sky-300 to-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:from-sky-200 hover:to-slate-200"
                >
                    Save Preferences
                </button>
                <button
                    onClick={handleAcceptAll}
                    className="rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
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
                <p className="mt-3 text-[10px] text-slate-600">
                    <Cookie className="inline h-3 w-3 mr-1" />
                    Last consented: {new Date(consent.consentedAt).toLocaleDateString()} · v{consent.version}
                </p>
            )}

            {/* Anti-sniffing shield status */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-400/5 border border-sky-400/10 px-3 py-2">
                <Shield className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-sky-300/70 leading-relaxed">
                    <strong className="text-sky-200">Anti-sniffing shield active.</strong>{' '}
                    Cookies are encrypted, signed with your browser fingerprint, and bound to this session.
                    Stolen cookies cannot be replayed from another device.
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-300"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto py-8">
                <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
                <p className="mt-2 text-sm text-slate-400">Manage your app preferences and account actions.</p>

                <div className="mt-6 space-y-6">
                    <section className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-white">Preferences</h2>
                        <div className="mt-4 space-y-3">
                            <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                                <span className="text-sm text-slate-300">Email notifications</span>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifications}
                                    onChange={() => toggle('emailNotifications')}
                                    className="h-4 w-4 rounded border-white/10 text-sky-300 focus:ring-sky-300/50"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                                <span className="text-sm text-slate-300">Sound effects</span>
                                <input
                                    type="checkbox"
                                    checked={settings.soundEffects}
                                    onChange={() => toggle('soundEffects')}
                                    className="h-4 w-4 rounded border-white/10 text-sky-300 focus:ring-sky-300/50"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                                <span className="text-sm text-slate-300">Compact mode</span>
                                <input
                                    type="checkbox"
                                    checked={settings.compactMode}
                                    onChange={() => toggle('compactMode')}
                                    className="h-4 w-4 rounded border-white/10 text-sky-300 focus:ring-sky-300/50"
                                />
                            </label>
                        </div>
                        <button
                            onClick={resetSettings}
                            className="mt-4 text-sm font-medium text-sky-300 hover:text-sky-200"
                        >
                            Reset to default
                        </button>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-white">Google Drive</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Connect your Google account to upload profile media to your own Drive storage.
                        </p>

                        <div className="mt-4 rounded-lg border border-white/10 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-slate-300">
                                        Status:{' '}
                                        <span className={`font-semibold ${userProfile.googleDrive ? 'text-sky-300' : 'text-slate-400'}`}>
                                            {userProfile.googleDrive ? 'Connected' : 'Not connected'}
                                        </span>
                                    </p>
                                    {userProfile.googleDrive?.email && (
                                        <p className="text-xs text-slate-500 mt-1">{userProfile.googleDrive.email}</p>
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
                                         className="rounded-md bg-linear-to-r from-sky-300 to-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:from-sky-200 hover:to-slate-200 disabled:opacity-50"
                                        >
                                            Connect Google Drive
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <label htmlFor="driveFolder" className="block text-sm font-medium text-slate-300">
                                    Drive Folder Link (optional)
                                </label>
                                <input
                                    id="driveFolder"
                                    value={driveFolderLink}
                                    onChange={(e) => setDriveFolderLink(e.target.value)}
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300/30"
                                />
                                <button
                                    onClick={saveDriveFolder}
                                    disabled={driveBusy || !userProfile.googleDrive}
                                    className="rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
                                >
                                    Save Folder
                                </button>
                            </div>
                        </div>
                    </section>

                    <CookiePrivacySection />

                    <section className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-white">Account</h2>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Name</dt>
                                <dd className="text-white font-medium">{userProfile.name}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Email</dt>
                                <dd className="text-white font-medium">{userProfile.email}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Role</dt>
                                <dd className="text-white font-medium capitalize">{userProfile.role}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Gender</dt>
                                <dd className="text-white font-medium capitalize">{userProfile.gender}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Account Type</dt>
                                <dd className="text-white font-medium capitalize">{userProfile.accountVisibility}</dd>
                            </div>
                        </dl>
                        <div className="mt-5">
                            <button
                                onClick={logout}
                                className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
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
