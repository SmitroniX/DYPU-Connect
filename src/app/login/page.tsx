'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { sendLoginLink } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        if (!email.endsWith('@dypatil.edu')) {
            toast.error('Only @dypatil.edu emails are allowed.');
            return;
        }

        setLoading(true);
        try {
            await sendLoginLink(email);
            setEmailSent(true);
            toast.success('Login link sent to your email!');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to send login link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            {/* Animated gradient backdrop */}
            <div
                className="absolute inset-0 bg-linear-to-br from-violet-600/20 via-slate-950 to-indigo-600/20 animate-[gradient-shift_6s_ease_infinite]"
                style={{ backgroundSize: '200% 200%' }}
            />

            {/* Floating blobs */}
            <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl animate-[pulse-glow_4s_ease-in-out_infinite]" />

            {/* Card */}
            <div className="relative z-10 max-w-md w-full mx-4 glass-strong p-8 animate-[fade-in-up_0.6s_ease-out]">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-indigo-400 tracking-tight">
                        ✦ DYPU Connect
                    </h2>
                    <p className="mt-3 text-sm text-slate-400">
                        Exclusive social platform for DY Patil University
                    </p>
                </div>

                {emailSent ? (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center animate-[fade-in-up_0.4s_ease-out]">
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-emerald-300">Check your email</h3>
                        <p className="mt-2 text-sm text-emerald-400/80">
                            We&apos;ve sent a sign-in link to <strong className="text-emerald-300">{email}</strong>.
                        </p>

                        {/* Spam folder warning */}
                        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-left">
                            <span className="text-lg leading-none mt-0.5">📂</span>
                            <p className="text-xs text-amber-300/90">
                                <strong className="text-amber-300">Can&apos;t find the email?</strong>{' '}
                                Please check your <span className="font-semibold text-amber-200">Spam</span> or{' '}
                                <span className="font-semibold text-amber-200">Junk</span> folder — sign-in
                                emails sometimes land there.
                            </p>
                        </div>
                    </div>
                ) : (
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                placeholder="Your @dypatil.edu email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold rounded-xl text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending link...
                                </span>
                            ) : (
                                <>
                                    Sign in with Email
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-center text-xs text-slate-600">
                    Only DY Patil University students can access this platform
                </p>
            </div>
        </div>
    );
}
