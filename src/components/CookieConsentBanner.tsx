'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    acceptAllCookies,
    declineNonEssentialCookies,
    getConsent,
    saveConsent,
} from '@/lib/cookies';
import { Cookie, ChevronDown, ChevronUp, Shield, Lock } from 'lucide-react';

// ---------------------------------------------------------------------------
// CookieConsentBanner
//
// GDPR-compliant cookie consent banner with CrowdStrike Falcon-inspired
// security aesthetics. Uses the open-source `cookies-next` library under
// the hood with hardened cookie attributes (Secure, SameSite=Strict).
//
// Categories:
//  ✓ Essential   — Always on (auth, sessions). Cannot be toggled.
//  ○ Analytics   — Firebase Analytics, performance data.
//  ○ Functional  — User preferences (theme, compact mode, etc.)
// ---------------------------------------------------------------------------

export default function CookieConsentBanner() {
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [prefs, setPrefs] = useState({ analytics: true, functional: true });

    useEffect(() => {
        // Only show if the user hasn't consented yet
        const consent = getConsent();
        if (!consent) {
            // Short delay to avoid flash during SSR hydration
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = useCallback(() => {
        acceptAllCookies();
        setVisible(false);
    }, []);

    const handleDeclineNonEssential = useCallback(() => {
        declineNonEssentialCookies();
        setVisible(false);
    }, []);

    const handleSavePreferences = useCallback(() => {
        saveConsent(prefs);
        setVisible(false);
    }, [prefs]);

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[9999] animate-[fade-in-up_0.5s_ease-out]">
            {/* Backdrop blur bar */}
            <div className="mx-auto max-w-2xl px-4 pb-4 sm:pb-6">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-black/40">
                    {/* Top accent stripe — Falcon security blue */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-sky-400/60 to-transparent" />

                    <div className="p-5 sm:p-6">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/15 ring-1 ring-sky-300/20">
                                <Shield className="h-5 w-5 text-sky-300" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Cookie className="h-4 w-4 text-sky-300" />
                                    Cookie &amp; Privacy Preferences
                                </h3>
                                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                                    DYPU Connect uses cookies to keep you signed in and improve your experience.
                                    We follow enterprise-grade security standards with hardened cookie policies.
                                </p>
                            </div>
                        </div>

                        {/* Expandable details */}
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-1.5 text-xs font-medium text-sky-300/80 hover:text-sky-200 transition-colors mb-4"
                        >
                            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {showDetails ? 'Hide details' : 'Manage preferences'}
                        </button>

                        {showDetails && (
                            <div className="mb-5 space-y-3 animate-[fade-in-up_0.2s_ease-out]">
                                {/* Essential */}
                                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Lock className="h-4 w-4 text-sky-300 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-white">Essential</p>
                                            <p className="text-[10px] text-slate-500">Authentication, sessions, security. Always active.</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wide bg-sky-300/10 px-2 py-0.5 rounded-full">
                                        Required
                                    </span>
                                </div>

                                {/* Analytics */}
                                <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3 cursor-pointer hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-4 shrink-0 text-center text-xs text-slate-400">📊</div>
                                        <div>
                                            <p className="text-xs font-semibold text-white">Analytics</p>
                                            <p className="text-[10px] text-slate-500">Firebase Analytics &amp; performance monitoring.</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={prefs.analytics}
                                            onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="h-5 w-9 rounded-full bg-white/10 peer-checked:bg-sky-500/60 transition-colors" />
                                        <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-slate-300 peer-checked:translate-x-4 peer-checked:bg-white transition-all shadow-sm" />
                                    </div>
                                </label>

                                {/* Functional */}
                                <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3 cursor-pointer hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-4 shrink-0 text-center text-xs text-slate-400">⚙️</div>
                                        <div>
                                            <p className="text-xs font-semibold text-white">Functional</p>
                                            <p className="text-[10px] text-slate-500">User preferences, themes, compact mode settings.</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={prefs.functional}
                                            onChange={(e) => setPrefs({ ...prefs, functional: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="h-5 w-9 rounded-full bg-white/10 peer-checked:bg-sky-500/60 transition-colors" />
                                        <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-slate-300 peer-checked:translate-x-4 peer-checked:bg-white transition-all shadow-sm" />
                                    </div>
                                </label>

                                {/* Security note */}
                                <div className="flex items-start gap-2 rounded-lg bg-sky-400/5 border border-sky-400/10 px-3 py-2">
                                    <Shield className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-sky-300/70 leading-relaxed">
                                        All cookies use <strong className="text-sky-200">Secure</strong>, <strong className="text-sky-200">SameSite=Strict</strong> attributes
                                        and follow CrowdStrike Falcon-grade security hardening practices.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {showDetails ? (
                                <button
                                    onClick={handleSavePreferences}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-200 to-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-300/15 hover:from-sky-100 hover:to-slate-200 transition-all duration-200"
                                >
                                    Save Preferences
                                </button>
                            ) : (
                                <button
                                    onClick={handleAcceptAll}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-200 to-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-300/15 hover:from-sky-100 hover:to-slate-200 transition-all duration-200"
                                >
                                    Accept All
                                </button>
                            )}
                            <button
                                onClick={handleDeclineNonEssential}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                Essential Only
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

