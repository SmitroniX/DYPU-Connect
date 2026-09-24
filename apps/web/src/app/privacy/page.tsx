'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Database, EyeOff, Server, HardDrive, KeyRound } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-[100dvh] bg-[var(--ui-bg-base)] text-[var(--ui-text)] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-[fade-in-up_0.4s_ease-out]">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
                        <ShieldCheck className="w-4 h-4 text-[var(--ui-accent)]" />
                        <span>Data Protection Standards v2.4</span>
                    </div>
                </div>

                {/* Hero Card */}
                <div className="surface p-6 sm:p-10 relative overflow-hidden">
                    <div className="flex items-start gap-4">
                        <div className="p-3.5 rounded-2xl bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] shrink-0">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ui-accent)]">
                                Security &amp; Information Governance
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-black text-[var(--ui-text)] tracking-tight mt-1">
                                Privacy Policy
                            </h1>
                            <p className="mt-2 text-sm text-[var(--ui-text-muted)] leading-relaxed">
                                How DY Patil University safeguards student personal data and communications • September 2026
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[var(--ui-border)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)]">
                            <span className="text-[var(--ui-text-muted)] block">Trackers &amp; Ads</span>
                            <span className="font-bold text-emerald-400 text-sm">Zero Commercial</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)]">
                            <span className="text-[var(--ui-text-muted)] block">Media Encryption</span>
                            <span className="font-bold text-[var(--ui-accent)] text-sm">AES-256-GCM</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)]">
                            <span className="text-[var(--ui-text-muted)] block">Public Message TTL</span>
                            <span className="font-bold text-blue-400 text-sm">48 Hours</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)]">
                            <span className="text-[var(--ui-text-muted)] block">Cloud Storage</span>
                            <span className="font-bold text-purple-400 text-sm">Google Drive</span>
                        </div>
                    </div>
                </div>

                {/* Policy Content Sections */}
                <div className="space-y-6">
                    {/* Section 1 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                01
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
                                <Database className="w-5 h-5 text-[var(--ui-accent)]" />
                                Student Data We Collect &amp; Why
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                DYPU-Connect operates exclusively to facilitate student campus life. We collect only information that is strictly necessary for identity verification, profile display, and peer communication:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--ui-text-muted)]">
                                <li><strong className="text-[var(--ui-text)]">Academic Identity:</strong> Official college email address (<code className="px-1 py-0.5 rounded bg-[var(--ui-bg-input)] text-[var(--ui-accent)] font-mono text-[11px]">@dypatil.edu</code>), student full name, department/field of study, academic year, and division.</li>
                                <li><strong className="text-[var(--ui-text)]">Profile Customization:</strong> Profile photo, biography, social links, and gallery highlights provided voluntarily by you.</li>
                                <li><strong className="text-[var(--ui-text)]">App Preferences:</strong> Selected theme mode (Dark/Light), chosen accent UI color, and notification subscription tokens.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                02
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-[var(--ui-accent)]" />
                                Cloud Infrastructure &amp; Personal Drive Integration
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                Unlike public social networks that monetize or index your media, DYPU-Connect stores student documents, assignments, and media files directly in your university-associated Google Drive account and secure Google Cloud infrastructure.
                            </p>
                            <p className="text-xs text-[var(--ui-text-muted)]">
                                You retain full ownership of every file uploaded. Revoking Google Drive authorization from your account settings immediately stops automated backups.
                            </p>
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                03
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-[var(--ui-accent)]" />
                                Client-Side Encryption &amp; Cryptographic Keys
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                Students can activate client-side cryptographic protection for private media uploads. When enabled, your files are encrypted locally in your browser using the <strong className="text-[var(--ui-text)]">AES-256-GCM</strong> cipher with a PBKDF2 key derivation function before transmitting over the network.
                            </p>
                        </div>
                    </div>

                    {/* Section 4 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                04
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
                                <EyeOff className="w-5 h-5 text-[var(--ui-accent)]" />
                                Anonymous Chat &amp; Confessions Transparency
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                The anonymous chat and confession boards mask your name, student ID, and avatar from fellow students. Peer interactions are designated with ephemeral anonymous aliases.
                            </p>
                            <div className="p-4 rounded-xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)] leading-relaxed space-y-1">
                                <span className="font-semibold text-[var(--ui-text)] block">Safety Transparency Notice</span>
                                To comply with institutional legal safety mandates, internal cryptographic audit logs are preserved for severe safety investigations (e.g., verified physical threats, hate speech, or crisis intervention) accessible only by authorized university compliance officers.
                            </div>
                        </div>
                    </div>

                    {/* Section 5 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                05
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
                                <Server className="w-5 h-5 text-[var(--ui-accent)]" />
                                Data Retention, Export &amp; Right to Erasure
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                We believe in minimal data footprint. Ephemeral public chat messages automatically purge after 48 hours. Stories automatically expire after 24 hours.
                            </p>
                            <p>
                                At any time, you can visit <Link href="/settings" className="text-[var(--ui-accent)] hover:underline font-semibold">Account Settings</Link> to download a complete export of your personal data archive, revoke active device sessions, or initiate permanent account deletion.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="surface p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-[var(--ui-text-muted)] text-center sm:text-left">
                        DY Patil University Data Protection &amp; Security Office •{' '}
                        <a href="mailto:privacy@dypatil.edu" className="text-[var(--ui-accent)] hover:underline font-mono">
                            privacy@dypatil.edu
                        </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/terms"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] transition-all"
                        >
                            Read Terms &amp; Conditions
                        </Link>
                        <Link
                            href="/login"
                            className="btn-primary !px-5 !py-2 !text-xs font-bold"
                        >
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
