'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Github, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const { signInWithGoogle, signInWithGithub, sendLoginLink, user, loading: authLoading } = useAuth();
    const router = useRouter();

    // If user is already signed in, redirect to home
    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/');
        }
    }, [authLoading, user, router]);

    const handleGoogleSignIn = async () => {
        setLoading('google');
        try {
            await signInWithGoogle();
            toast.success('Signed in successfully!');
            router.replace('/');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
        } finally {
            setLoading(null);
        }
    };

    const handleGithubSignIn = async () => {
        setLoading('github');
        try {
            await signInWithGithub();
            toast.success('Signed in successfully!');
            router.replace('/');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'GitHub sign-in failed');
        } finally {
            setLoading(null);
        }
    };

    const handleEmailLinkSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error('Please enter your email');
        if (!email.endsWith('@dypatil.edu')) return toast.error('Only @dypatil.edu emails are allowed');

        setLoading('email');
        try {
            await sendLoginLink(email);
            toast.success('Magic link sent to your email!');
            setEmail('');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to send magic link');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-base)] relative overflow-hidden p-4">
            {/* Background decoration */}
            <div
                className="absolute inset-0 bg-linear-to-br from-[var(--ui-accent)]/8 via-[var(--ui-bg-base)] to-[var(--ui-accent)]/5 animate-[gradient-shift_6s_ease_infinite]"
                style={{ backgroundSize: '200% 200%' }}
            />
            <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-[var(--ui-accent)]/5 blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-[var(--ui-accent)]/3 blur-3xl" />

            {/* Card */}
            <div className="relative z-10 max-w-md w-full surface p-6 sm:p-10 animate-[fade-in-up_0.6s_ease-out]">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--ui-accent-dim)] mb-4 animate-[bounce-in_0.8s_ease]">
                        <span className="text-3xl font-bold text-[var(--ui-accent)]">✦</span>
                    </div>
                    <h2 className="text-3xl font-black text-[var(--ui-text)] tracking-tight">
                        DYPU Connect
                    </h2>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Campus access restricted to @dypatil.edu
                    </p>
                </div>

                {/* Email Magic Link Section */}
                <form onSubmit={handleEmailLinkSignIn} className="space-y-4 mb-8">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-[var(--ui-text-muted)] group-focus-within:text-[var(--ui-accent)] transition-colors" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="University email (name@dypatil.edu)"
                            className="block w-full pl-11 pr-4 py-3.5 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-xl text-sm text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:ring-2 focus:ring-[var(--ui-accent)]/20 focus:border-[var(--ui-accent)] outline-none transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!!loading}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold rounded-xl bg-[var(--ui-accent)] text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[var(--ui-accent)]/20"
                    >
                        {loading === 'email' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Send Magic Link
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--ui-border)]"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[var(--ui-bg-surface)] px-3 text-[var(--ui-text-muted)] font-medium">Or continue with</span>
                    </div>
                </div>

                {/* Social Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Google Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={!!loading}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 text-xs font-bold rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.96] transition-all shadow-md disabled:opacity-50"
                    >
                        {loading === 'google' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </>
                        )}
                    </button>

                    {/* GitHub Button */}
                    <button
                        onClick={handleGithubSignIn}
                        disabled={!!loading}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 text-xs font-bold rounded-xl bg-[#24292f] text-white hover:bg-[#1a1e22] active:scale-[0.96] transition-all shadow-md disabled:opacity-50"
                    >
                        {loading === 'github' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Github className="w-4 h-4" />
                                GitHub
                            </>
                        )}
                    </button>
                </div>

                {/* Security Badge */}
                <div className="flex items-start gap-3 rounded-xl bg-[var(--ui-accent-dim)] border border-[var(--ui-accent)]/10 px-4 py-4">
                    <ShieldCheck className="h-5 w-5 text-[var(--ui-accent)] shrink-0" />
                    <div className="text-[11px] text-[var(--ui-text-muted)] leading-relaxed">
                        <p>Your privacy is our priority. We exclusively use secure OIDC and passwordless authentication methods.</p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[11px] text-[var(--ui-text-muted)] font-medium">
                    Powered by Firebase Authentication &bull; MIT Licensed
                </p>
            </div>
        </div>
    );
}
