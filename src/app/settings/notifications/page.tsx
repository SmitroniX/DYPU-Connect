'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageSquare, AtSign, Users, MessageCircle, Megaphone, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NotificationsSettingsPage() {
    const { userProfile, currentUser: user } = useStore();
    const [saving, setSaving] = useState(false);

    // Provide default fallback if prefs don't exist yet
    const prefs = userProfile?.notificationPrefs || {
        directMessages: true,
        mentions: true,
        groupMessages: true,
        confessions: true,
        announcements: true,
    };

    const handleToggle = async (key: keyof typeof prefs) => {
        if (!user || saving) return;
        setSaving(true);
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                notificationPrefs: newPrefs
            });
            // The local store is automatically updated by the listener in AuthProvider
        } catch (error) {
            toast.error('Failed to update preferences');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-full bg-[var(--ui-bg-base)] text-[var(--ui-text)] flex justify-center pb-20 pt-safe lg:pt-0">
            <div className="w-full max-w-2xl px-4 py-8 relative">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link 
                        href="/settings" 
                        className="p-2 rounded-full hover:bg-[var(--ui-bg-elevated)] transition-colors text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>
                        <p className="text-[var(--ui-text-muted)] text-[15px] mt-1">
                            Choose what you want to be notified about.
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--ui-bg-elevated)] border border-[var(--ui-divider)] rounded-[20px] shadow-sm overflow-hidden">
                    <div className="p-1 px-4 py-3 bg-[var(--ui-bg)] border-b border-[var(--ui-divider)] flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider text-[var(--ui-text-muted)]">Push Notifications</span>
                        {saving && <Loader2 className="w-4 h-4 animate-spin text-[var(--ui-text-muted)]" />}
                    </div>
                    <div className="divide-y divide-[var(--ui-divider)]">
                        <ToggleRow
                            icon={MessageSquare}
                            title="Direct Messages"
                            description="When someone sends you a private chat message."
                            enabled={prefs.directMessages}
                            onToggle={() => handleToggle('directMessages')}
                            disabled={saving}
                        />
                        <ToggleRow
                            icon={AtSign}
                            title="Mentions"
                            description="When someone tags you in a public or group chat."
                            enabled={prefs.mentions}
                            onToggle={() => handleToggle('mentions')}
                            disabled={saving}
                        />
                        <ToggleRow
                            icon={Users}
                            title="Group Messages"
                            description="When there is activity in groups you have joined."
                            enabled={prefs.groupMessages}
                            onToggle={() => handleToggle('groupMessages')}
                            disabled={saving}
                        />
                        <ToggleRow
                            icon={MessageCircle}
                            title="Confession Replies"
                            description="When someone replies to your anonymous confession."
                            enabled={prefs.confessions}
                            onToggle={() => handleToggle('confessions')}
                            disabled={saving}
                        />
                        <ToggleRow
                            icon={Megaphone}
                            title="Announcements"
                            description="Important campus or system-wide alerts."
                            enabled={prefs.announcements}
                            onToggle={() => handleToggle('announcements')}
                            disabled={saving}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleRow({
    icon: Icon,
    title,
    description,
    enabled,
    onToggle,
    disabled
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
}) {
    return (
        <label onClick={(e) => { e.preventDefault(); onToggle(); }} className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--ui-bg-hover)] transition-colors ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
            <div className={`p-2.5 rounded-xl shrink-0 ${enabled ? 'bg-[var(--ui-accent)] text-white shadow-md' : 'bg-[var(--ui-bg)] text-[var(--ui-text-muted)]'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-[16px] text-[var(--ui-text)]">{title}</div>
                <div className="text-[14px] text-[var(--ui-text-muted)] leading-snug pr-4">{description}</div>
            </div>
            <div className="shrink-0 pl-4">
                <div className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out flex ${enabled ? 'bg-[var(--ui-accent)]' : 'bg-[var(--ui-divider)]'}`}>
                    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-5.5' : 'translate-x-0'}`} />
                </div>
            </div>
        </label>
    );
}
