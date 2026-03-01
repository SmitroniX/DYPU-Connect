'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { verifyLoginLink } = useAuth();
    const router = useRouter();
    const mounted = useRef(false);

    useEffect(() => {
        if (mounted.current) return;
        mounted.current = true;

        const verifyLink = async () => {
            let email = window.localStorage.getItem('emailForSignIn');

            if (!email) {
                email = window.prompt('Please verify your email (@dypatil.edu) for confirmation');
            }

            if (!email || !email.endsWith('@dypatil.edu')) {
                setError('Valid @dypatil.edu email is required for sign-in.');
                setLoading(false);
                return;
            }

            try {
                await verifyLoginLink(email, window.location.href);
                toast.success('Successfully signed in!');
                router.push('/');
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to verify login link.');
            } finally {
                setLoading(false);
            }
        };

        verifyLink();
    }, [verifyLoginLink, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--dc-bg-tertiary)] relative overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-linear-to-br from-sky-300/10 via-[var(--dc-bg-tertiary)] to-slate-400/10 animate-[gradient-shift_6s_ease_infinite]"
                style={{ backgroundSize: '200% 200%' }}
            />
            <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-sky-200/8 blur-3xl animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-slate-300/8 blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 max-w-md w-full mx-4 glass-strong p-8 text-center animate-[fade-in-up_0.6s_ease-out]">
                {loading ? (
                    <div className="py-4">
                        <div className="animate-[pulse-glow_2s_ease-in-out_infinite] mb-6">
                            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-sky-200 to-slate-300">
                                ✦ DYPU Connect
                            </h1>
                        </div>
                        <p className="text-white font-semibold mb-4">Verifying your login...</p>
                        <div className="flex justify-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-200 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                ) : error ? (
                    <div className="py-4 animate-[fade-in-up_0.4s_ease-out]">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-400 mb-2">Verification Failed</h2>
                        <p className="text-sm text-slate-400 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl text-slate-900 bg-linear-to-r from-sky-200 to-slate-300 hover:from-sky-100 hover:to-slate-200 transition-all duration-300 shadow-lg shadow-sky-300/15"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
