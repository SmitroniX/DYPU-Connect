'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Settings, Power, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface SystemSettings {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    disableConfessions: boolean;
    disableAnonymousChat: boolean;
    disablePublicChat: boolean;
    disableGroups: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
    maintenanceMode: false,
    maintenanceMessage: 'The system is currently undergoing scheduled maintenance. Please check back later.',
    disableConfessions: false,
    disableAnonymousChat: false,
    disablePublicChat: false,
    disableGroups: false,
};

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'system_settings', 'global');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as SystemSettings);
            } else {
                // Initialize if it doesn't exist
                await setDoc(docRef, {
                    ...DEFAULT_SETTINGS,
                    updatedAt: serverTimestamp(),
                });
                setSettings(DEFAULT_SETTINGS);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load system settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'system_settings', 'global');
            await setDoc(docRef, {
                ...settings,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            
            toast.success('System settings updated successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleSetting = (key: keyof SystemSettings) => {
        if (typeof settings[key] === 'boolean') {
            setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <RefreshCw className="h-8 w-8 text-[var(--ui-accent)] animate-spin mb-4" />
                <p className="text-[var(--ui-text-muted)]">Loading system configuration...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ui-text)] flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20">
                            <Settings className="h-5 w-5 text-[var(--ui-accent)]" />
                        </span>
                        System Configuration
                    </h1>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Manage global platform settings and feature availability.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--ui-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ui-accent-hover)] transition-all disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="space-y-6">
                {/* Maintenance Mode */}
                <div className="surface p-6 border-l-4 border-l-red-500 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Maintenance Mode
                            </h2>
                            <p className="text-sm text-[var(--ui-text-muted)] mb-4">
                                Enabling this will block all non-admin users from accessing the platform. They will see a maintenance screen instead.
                            </p>
                            
                            {settings.maintenanceMode && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-[var(--ui-text-muted)] mb-1">
                                        Maintenance Message
                                    </label>
                                    <textarea
                                        value={settings.maintenanceMessage}
                                        onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                                        className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-hidden"
                                        rows={3}
                                        placeholder="Enter the message to display to users..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className="ml-6 flex items-center h-full pt-1">
                            <button
                                onClick={() => toggleSetting('maintenanceMode')}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[var(--ui-accent)] focus:ring-offset-2 ${
                                    settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                                role="switch"
                                aria-checked={settings.maintenanceMode}
                            >
                                <span className="sr-only">Toggle Maintenance Mode</span>
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                        settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Module Toggles */}
                <div className="surface p-6 rounded-lg shadow-sm">
                    <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2 mb-6">
                        <Power className="h-5 w-5 text-[var(--ui-accent)]" />
                        Feature Modules
                    </h2>
                    
                    <div className="space-y-6">
                        <ToggleItem
                            title="Disable Confessions"
                            description="Turn off the confessions module globally. Users will not be able to view or submit new confessions."
                            checked={settings.disableConfessions}
                            onChange={() => toggleSetting('disableConfessions')}
                        />
                        <div className="h-px bg-[var(--ui-border)] w-full" />
                        <ToggleItem
                            title="Disable Anonymous Chat"
                            description="Turn off the anonymous public chat (Shadow Realm)."
                            checked={settings.disableAnonymousChat}
                            onChange={() => toggleSetting('disableAnonymousChat')}
                        />
                         <div className="h-px bg-[var(--ui-border)] w-full" />
                        <ToggleItem
                            title="Disable Public Chat"
                            description="Turn off the main public chat room."
                            checked={settings.disablePublicChat}
                            onChange={() => toggleSetting('disablePublicChat')}
                        />
                        <div className="h-px bg-[var(--ui-border)] w-full" />
                        <ToggleItem
                            title="Disable Groups"
                            description="Turn off the groups functionality entirely."
                            checked={settings.disableGroups}
                            onChange={() => toggleSetting('disableGroups')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleItem({ title, description, checked, onChange }: { title: string, description: string, checked: boolean, onChange: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex-1 pr-6">
                <h3 className="text-sm font-semibold text-[var(--ui-text)] flex items-center gap-2">
                    {title}
                    {checked && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">Disabled</span>}
                </h3>
                <p className="text-xs text-[var(--ui-text-muted)] mt-1">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[var(--ui-accent)] focus:ring-offset-2 ${
                    checked ? 'bg-red-500' : 'bg-green-500'
                }`}
                role="switch"
                aria-checked={checked}
            >
                <span className="sr-only">{title}</span>
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}
