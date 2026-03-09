'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ShieldAlert, Plus, Trash2, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { useSystemStore } from '@/store/useSystemStore';

export default function ModerationRulesPage() {
    const { settings, isInitializing } = useSystemStore();
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isInitializing && settings?.bannedKeywords) {
            setKeywords(settings.bannedKeywords);
        }
    }, [isInitializing, settings]);

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        const word = newKeyword.trim().toLowerCase();
        if (!word) return;
        if (keywords.includes(word)) {
            toast.error('Keyword already exists');
            return;
        }
        setKeywords(prev => [...prev, word]);
        setNewKeyword('');
    };

    const handleRemoveKeyword = (wordToRemove: string) => {
        setKeywords(prev => prev.filter(w => w !== wordToRemove));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'system_settings', 'global');
            await setDoc(docRef, {
                bannedKeywords: keywords,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            toast.success('Moderation rules updated successfully');
        } catch (error) {
            console.error('Failed to save rules:', error);
            toast.error('Failed to save moderation rules');
        } finally {
            setSaving(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <RefreshCw className="h-8 w-8 text-[var(--ui-accent)] animate-spin mb-4" />
                <p className="text-[var(--ui-text-muted)]">Loading moderation rules...</p>
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
                            <ShieldAlert className="h-5 w-5 text-[var(--ui-accent)]" />
                        </span>
                        Auto-Moderation Rules
                    </h1>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Manage banned keywords and custom profanity filters globally across the platform.
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
                <div className="surface p-6 rounded-lg shadow-sm border border-[var(--ui-border)]">
                    <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-[var(--ui-text-muted)]" />
                        Banned Keywords List
                    </h2>
                    
                    <p className="text-sm text-[var(--ui-text-muted)] mb-6">
                        Words added here will be partially censored (e.g., F*ck) in Confessions and Public/Anonymous Chat automatically. They are checked in real-time.
                    </p>

                    <form onSubmit={handleAddKeyword} className="flex gap-3 mb-6">
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            placeholder="Enter a banned keyword (e.g. spam, slur)"
                            className="flex-1 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:ring-1 focus:ring-[var(--ui-accent)] focus:outline-hidden"
                            required
                        />
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ui-bg-hover)] border border-[var(--ui-border)] px-4 py-2 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-border)] transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Word
                        </button>
                    </form>

                    <div className="h-px bg-[var(--ui-border)] w-full mb-6" />

                    {keywords.length === 0 ? (
                        <div className="text-center py-8">
                            <ShieldAlert className="h-8 w-8 text-[var(--ui-text-muted)] mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-[var(--ui-text-muted)]">No custom keywords defined.</p>
                            <p className="text-xs text-[var(--ui-text-muted)] mt-1">The system default profanity list is still active.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {keywords.map((word) => (
                                <div key={word} className="inline-flex items-center gap-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full px-3 py-1 text-sm text-[var(--ui-text)] hover:border-red-500/30 transition-colors group">
                                    <span>{word}</span>
                                    <button
                                        onClick={() => handleRemoveKeyword(word)}
                                        className="text-[var(--ui-text-muted)] hover:text-red-500 rounded-full p-0.5 transition-colors"
                                        aria-label="Remove keyword"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
