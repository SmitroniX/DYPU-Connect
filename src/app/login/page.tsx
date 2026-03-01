'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { sendLoginLink, signInWithGoogle } = useAuth();
    const router = useRouter();

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

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            await signInWithGoogle();
            toast.success('Signed in with Google!');
            router.push('/');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] relative overflow-hidden">
            {/* Moonstone gradient backdrop */}
            <div
                className="absolute inset-0 bg-linear-to-br from-sky-300/10 via-[#0a0e1a] to-slate-400/10 animate-[gradient-shift_6s_ease_infinite]"
                style={{ backgroundSize: '200% 200%' }}
            />

            {/* Floating moonstone glows */}
            <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-sky-200/8 blur-3xl animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-slate-300/8 blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-200/5 blur-3xl animate-[pulse-glow_4s_ease-in-out_infinite]" />

            {/* Card */}
            <div className="relative z-10 max-w-md w-full mx-4 glass-strong p-8 animate-[fade-in-up_0.6s_ease-out]">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-sky-200 to-slate-300 tracking-tight">
                        ✦ DYPU Connect
                    </h2>
                    <p className="mt-3 text-sm text-slate-400">
                        Exclusive social platform for DY Patil University
                    </p>
                </div>

                {emailSent ? (
                    <div className="rounded-xl bg-sky-500/10 border border-sky-400/20 p-6 text-center animate-[fade-in-up_0.4s_ease-out]">
                        <CheckCircle className="w-10 h-10 text-sky-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-sky-200">Check your email</h3>
                        <p className="mt-2 text-sm text-sky-300/80">
                            We&apos;ve sent a sign-in link to <strong className="text-sky-200">{email}</strong>.
                        </p>

                        {/* Spam folder warning */}
                        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-sky-400/10 border border-sky-400/20 px-4 py-3 text-left">
                            <span className="text-lg leading-none mt-0.5">📂</span>
                            <p className="text-xs text-sky-200/90">
                                <strong className="text-sky-200">Can&apos;t find the email?</strong>{' '}
                                Please check your <span className="font-semibold text-sky-100">Spam</span> or{' '}
                                <span className="font-semibold text-sky-100">Junk</span> folder — sign-in
                                emails sometimes land there.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Google Sign-In button */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || loading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 text-sm font-semibold rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-all duration-300 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {googleLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin" />
                                    Connecting...
                                </span>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </>
                            )}
                        </button>

                        <p className="text-[10px] text-center text-sky-300/50">
                            Google sign-in auto-connects your Drive for media storage
                        </p>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-[#0a0e1a] px-3 text-slate-500">or use email link</span>
                            </div>
                        </div>

                        {/* Email link form */}
                        <form className="space-y-4" onSubmit={handleLogin}>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all"
                                    placeholder="Your @dypatil.edu email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || googleLoading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold rounded-xl text-slate-900 bg-linear-to-r from-sky-200 to-slate-300 hover:from-sky-100 hover:to-slate-200 transition-all duration-300 shadow-lg shadow-sky-300/15 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                        Sending link...
                                    </span>
                                ) : (
                                    <>
                                        Send Email Link
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                <p className="mt-6 text-center text-xs text-slate-600">
                    Only DY Patil University students can access this platform
                </p>
            </div>
        </div>
    );
}
