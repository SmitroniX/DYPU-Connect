'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, Check } from 'lucide-react';

interface LegalModalProps {
    type: 'terms' | 'privacy' | null;
    onClose: () => void;
    onAccept?: () => void;
}

export default function LegalModal({ type, onClose, onAccept }: LegalModalProps) {
    if (!type) return null;

    const isTerms = type === 'terms';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                    className="relative z-10 w-full max-w-2xl rounded-3xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[var(--ui-accent-dim)] text-[var(--ui-accent)]">
                                {isTerms ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--ui-text)]">
                                    {isTerms ? 'Terms & Conditions' : 'Privacy Policy'}
                                </h3>
                                <p className="text-xs text-[var(--ui-text-muted)]">
                                    DY Patil University Community Guidelines • Last updated September 2026
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close modal"
                            className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="p-6 overflow-y-auto space-y-5 text-sm text-[var(--ui-text-secondary)] leading-relaxed">
                        {isTerms ? (
                            <>
                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">1. Campus Community & Acceptance</h4>
                                    <p>
                                        DYPU-Connect is an exclusive social and academic platform designed solely for students, faculty, and authorized members of DY Patil University. By signing in, creating an account, or using any feature, you agree to abide by these Terms and Conditions and our University Code of Conduct.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">2. Eligibility & College Credentials</h4>
                                    <p>
                                        Access requires an active institutional email address (<code className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-input)] text-[var(--ui-accent)] font-mono text-xs">@dypatil.edu</code>) or verified student credentials. Impersonation of students, staff, or faculty is strictly forbidden and subject to administrative suspension.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">3. Acceptable Use & Campus Safety</h4>
                                    <p>
                                        DYPU-Connect fosters an inclusive, safe, and collaborative campus environment. You agree NOT to:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-xs">
                                        <li>Post hate speech, harassment, bullying, defamation, or threats of violence.</li>
                                        <li>Share explicit, obscene, or non-consensual imagery.</li>
                                        <li>Engage in unauthorized commercial solicitation, spam, or phishing.</li>
                                        <li>Attempt to exploit, decompile, reverse-engineer, or breach system security.</li>
                                    </ul>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">4. Moderation & Community Reports</h4>
                                    <p>
                                        All public chat messages, anonymous posts, and community channels are actively moderated by campus administrators. Violations will result in automated content removal, temporary timeouts, or permanent student account revocation.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">5. Academic Integrity</h4>
                                    <p>
                                        DYPU-Connect may not be used to distribute exam papers, leak test answers, or facilitate academic dishonesty.
                                    </p>
                                </section>
                            </>
                        ) : (
                            <>
                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">1. Information We Collect</h4>
                                    <p>
                                        To maintain your student profile and enable messaging, we collect your college email, full name, selected department, academic year, division, and optional profile details (avatar, bio, social links).
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">2. Storage & Cloud Data Handling</h4>
                                    <p>
                                        Profile images and documents are stored securely using Google Drive and Firebase Cloud Infrastructure. Media can optionally be client-side encrypted using AES-256-GCM before upload.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">3. Cookie & Session Privacy</h4>
                                    <p>
                                        We use strictly necessary functional tokens to maintain secure login sessions and persistent device authentication. Functional cookies store your preferred interface theme and UI accent color. We never sell your personal data or use third-party tracking trackers.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">4. Anonymous Chat & Confessions</h4>
                                    <p>
                                        Anonymous chat sessions and confessions mask your identity from peers. However, to maintain safety against severe campus threats, moderation logs maintain internal audit traces accessible strictly by designated university security personnel.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-[var(--ui-text)] text-base">5. Data Retention & Deletion</h4>
                                    <p>
                                        Public messages automatically expire after 48 hours. You may request account deletion or export your activity logs at any time from your Account Settings.
                                    </p>
                                </section>
                            </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                        >
                            Close
                        </button>
                        {onAccept && (
                            <button
                                type="button"
                                onClick={() => {
                                    onAccept();
                                    onClose();
                                }}
                                className="btn-primary !px-5 !py-2 !text-sm flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Accept &amp; Continue
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
