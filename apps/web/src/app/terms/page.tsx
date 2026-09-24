'use client';

import Link from 'next/link';
import { FileText, ArrowLeft, ShieldAlert, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TermsPage() {
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
                        <Scale className="w-4 h-4 text-[var(--ui-accent)]" />
                        <span>University Policy Document v2.4</span>
                    </div>
                </div>

                {/* Main Hero Card */}
                <div className="surface p-6 sm:p-10 relative overflow-hidden">
                    <div className="flex items-start gap-4">
                        <div className="p-3.5 rounded-2xl bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] shrink-0">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ui-accent)]">
                                Legal &amp; Student Conduct
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-black text-[var(--ui-text)] tracking-tight mt-1">
                                Terms and Conditions
                            </h1>
                            <p className="mt-2 text-sm text-[var(--ui-text-muted)] leading-relaxed">
                                DY Patil University Campus Community Platform • Effective September 2026
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)] flex flex-wrap gap-4 sm:gap-8">
                        <div>
                            <span className="block font-semibold text-[var(--ui-text-secondary)]">Scope</span>
                            <span>DYPU-Connect Web &amp; Desktop</span>
                        </div>
                        <div>
                            <span className="block font-semibold text-[var(--ui-text-secondary)]">Governing Entity</span>
                            <span>DY Patil University Administration</span>
                        </div>
                        <div>
                            <span className="block font-semibold text-[var(--ui-text-secondary)]">Mandatory Compliance</span>
                            <span>All Registered Students &amp; Faculty</span>
                        </div>
                    </div>
                </div>

                {/* Terms Content Sections */}
                <div className="space-y-6">
                    {/* Section 1 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                01
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)]">
                                Campus Community &amp; Binding Acceptance
                            </h2>
                        </div>
                        <p className="text-sm text-[var(--ui-text-secondary)] leading-relaxed pl-10">
                            DYPU-Connect is an exclusive campus portal developed strictly for students, researchers, faculty, and authorized staff of DY Patil University. By signing in, authenticating via Google OAuth, requesting an email magic link, or using any feature, you signify your unreserved acceptance of these Terms and Conditions along with the University Code of Conduct.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                02
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)]">
                                Student Credentials &amp; Verification
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                Access to DYPU-Connect requires verified university-affiliated credentials (<code className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-input)] text-[var(--ui-accent)] font-mono text-xs">@dypatil.edu</code>) or designated institutional access keys.
                            </p>
                            <div className="p-4 rounded-xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)] space-y-2">
                                <h3 className="font-semibold text-xs text-[var(--ui-text)] uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    Account Security Requirements
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--ui-text-muted)]">
                                    <li>You are solely responsible for protecting access to your login credentials and authentication links.</li>
                                    <li>Sharing accounts, masquerading as another student, or transferring credentials is strictly prohibited.</li>
                                    <li>Any suspicious activity must be promptly reported to the campus IT service desk.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                03
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)]">
                                Acceptable Use &amp; Community Safety Standards
                            </h2>
                        </div>
                        <div className="pl-10 space-y-4 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                DYPU-Connect serves to empower learning, collaboration, and student engagement. All users must maintain civility and respect at all times.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                                    <h4 className="font-bold text-red-400 text-xs uppercase tracking-wide flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" />
                                        Strictly Prohibited
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--ui-text-muted)]">
                                        <li>Harassment, stalking, cyberbullying, or hate speech targeting any student or group.</li>
                                        <li>Sharing unconsented media, adult content, or personally identifiable information (doxxing).</li>
                                        <li>Spamming, automated bot activity, or unsolicited commercial advertising.</li>
                                        <li>Reverse engineering, vulnerability probing, or unauthorized network exploitation.</li>
                                    </ul>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                                    <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Encouraged Behavior
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--ui-text-muted)]">
                                        <li>Peer collaboration on academic projects, notes, and study groups.</li>
                                        <li>Constructive discussions in public and departmental chat channels.</li>
                                        <li>Empathetic peer support and campus event announcements.</li>
                                        <li>Reporting violations to moderators through in-app report tools.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                04
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)]">
                                Moderation &amp; Administrative Oversight
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                All public communication channels, group chats, anonymous boards, and confessions are subject to real-time administrative oversight and community moderation.
                            </p>
                            <p>
                                While confessions mask student identity from peers, automated safety filters and administrative logs record cryptographic audit hashes to protect students from severe campus safety hazards, self-harm incidents, or illegal threats.
                            </p>
                        </div>
                    </div>

                    {/* Section 5 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                05
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)]">
                                Academic Integrity &amp; Examination Conduct
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                DYPU-Connect adheres to DY Patil University&apos;s strict academic honesty standards. Using any chat channel, file exchange, or private message to distribute unauthorized examination material, leak question papers, or commit academic fraud will trigger immediate referral to the University Disciplinary Committee.
                            </p>
                        </div>
                    </div>

                    {/* Section 6 */}
                    <div className="surface p-6 sm:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] text-sm font-bold">
                                06
                            </div>
                            <h2 className="text-lg font-bold text-[var(--ui-text)]">
                                Account Termination &amp; Suspension
                            </h2>
                        </div>
                        <div className="pl-10 space-y-3 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                            <p>
                                The University Administration reserves the right to temporarily suspend or permanently ban accounts found in violation of these Terms. Severe infractions may also carry disciplinary consequences under the university charter.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="surface p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-[var(--ui-text-muted)] text-center sm:text-left">
                        Have questions about our campus policies? Contact the DYPU IT Governance desk at{' '}
                        <a href="mailto:support@dypatil.edu" className="text-[var(--ui-accent)] hover:underline font-mono">
                            support@dypatil.edu
                        </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/privacy"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] transition-all"
                        >
                            Read Privacy Policy
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
