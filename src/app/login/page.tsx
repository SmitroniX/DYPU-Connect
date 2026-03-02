'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const { signInWithGoogle, user, loading: authLoading } = useAuth();
    const router = useRouter();

    // If user is already signed in, redirect to home
    useEffect(() => {
        if (!authLoading && user) {
            router.push('/');
        }
    }, [authLoading, user, router]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            toast.success('Signed in successfully!');
            router.push('/');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-base)] relative overflow-hidden">
            {/* Background decoration */}
            <div
                className="absolute inset-0 bg-linear-to-br from-[var(--ui-accent)]/8 via-[var(--ui-bg-base)] to-[var(--ui-accent)]/5 animate-[gradient-shift_6s_ease_infinite]"
                style={{ backgroundSize: '200% 200%' }}
            />
            <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-[var(--ui-accent)]/5 blur-3xl animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-[var(--ui-accent)]/3 blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />

            {/* Card */}
            <div className="relative z-10 max-w-sm w-full mx-4 surface p-8 animate-[fade-in-up_0.6s_ease-out]">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--ui-accent-dim)] mb-4">
                        <span className="text-2xl font-bold text-[var(--ui-accent)]">✦</span>
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--ui-text)] tracking-tight">
                        DYPU Connect
                    </h2>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Sign in with your university Google account
                    </p>
                </div>

                {/* Google Sign-In button */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 text-sm font-semibold rounded-xl bg-white text-zinc-800 hover:bg-zinc-100 transition-colors duration-200 shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                            Signing in...
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

                {/* Info */}
                <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-[var(--ui-accent-dim)] border border-[var(--ui-accent)]/10 px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-[var(--ui-accent)] shrink-0 mt-0.5" />
                    <div className="text-xs text-[var(--ui-text-muted)] leading-relaxed">
                        <p>Only <strong className="text-[var(--ui-text-secondary)]">@dypatil.edu</strong> Google accounts are accepted.</p>
                        <p className="mt-1">Your Google Drive is auto-connected for media storage.</p>
                    </div>
                </div>

                <p className="mt-6 text-center text-[11px] text-[var(--ui-text-muted)]">
                    Exclusive to DY Patil University students
                </p>
            </div>
        </div>
    );
}
