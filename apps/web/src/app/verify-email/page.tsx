'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { validateEmail } from '@/lib/validation/authValidation';
import { AppError } from '@/lib/errors';

export default function VerifyEmailPage() {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'needs_email'>('verifying');
    const [emailInput, setEmailInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const { verifyLoginLink, user } = useAuth();
    const router = useRouter();
    const isVerifying = useRef(false);

    // If user is already authenticated, redirect to dashboard
    useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    const executeVerification = useCallback(async (emailToVerify: string, url: string) => {
        isVerifying.current = true;
        setStatus('verifying');
        
        try {
            await verifyLoginLink(emailToVerify, url);
            window.localStorage.removeItem('emailForSignIn');
            setStatus('success');
            // User state will update and the useEffect above will redirect them to '/'
        } catch (error: unknown) {
            setStatus('error');
            setErrorMessage(error instanceof AppError ? error.message : 'The login link is invalid or has expired.');
        } finally {
            isVerifying.current = false;
        }
    }, [verifyLoginLink]);

    useEffect(() => {
        if (isVerifying.current || user) return;
        
        // This is a browser environment check to prevent SSR issues
        if (typeof window === 'undefined') return;

        const url = window.location.href;
        const email = window.localStorage.getItem('emailForSignIn');

        // Check if this is a valid sign-in link
        if (!email) {
            const timer = setTimeout(() => setStatus('needs_email'), 0);
            return () => clearTimeout(timer);
        }

        executeVerification(email, url);
    }, [user, executeVerification]);

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const validation = validateEmail(emailInput);
        if (!validation.valid || !validation.email) {
            setErrorMessage(validation.error || 'Invalid email');
            return;
        }
        
        setErrorMessage('');
        executeVerification(validation.email, window.location.href);
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-transparent relative overflow-hidden p-4">
            <div className="relative z-10 max-w-md w-full surface p-8 sm:p-10 text-center animate-[fade-in-up_0.6s_ease-out]">
                
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-[var(--ui-accent)] animate-spin mb-6" />
                        <h2 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Verifying Link</h2>
                        <p className="text-[var(--ui-text-muted)]">Please wait while we securely log you in...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Login Successful!</h2>
                        <p className="text-[var(--ui-text-muted)] mb-6">Taking you to your dashboard...</p>
                        <Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" />
                    </div>
                )}

                {status === 'needs_email' && (
                    <div className="flex flex-col items-center text-left">
                        <div className="w-16 h-16 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mb-6 self-center">
                            <AlertCircle className="w-8 h-8 text-[var(--ui-accent)]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--ui-text)] mb-2 text-center w-full">Confirm Your Email</h2>
                        <p className="text-[var(--ui-text-muted)] text-sm mb-6 text-center">
                            You opened this link on a different device or browser. For security, please enter the @dypatil.edu email address you used to request this link.
                        </p>
                        
                        <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
                            <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="University email (name@dypatil.edu)"
                                className="block w-full px-4 py-3.5 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-xl text-sm text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:ring-2 focus:ring-[var(--ui-accent)]/20 focus:border-[var(--ui-accent)] outline-none transition-all"
                                required
                            />
                            
                            {errorMessage && (
                                <p className="text-red-400 text-sm">{errorMessage}</p>
                            )}
                            
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold rounded-xl bg-[var(--ui-accent)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[var(--ui-accent)]/20"
                            >
                                Verify & Login
                            </button>
                        </form>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Verification Failed</h2>
                        <p className="text-[var(--ui-text-muted)] mb-8">{errorMessage}</p>
                        
                        <button
                            onClick={() => router.replace('/login')}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold rounded-xl bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-hover)] active:scale-[0.98] transition-all"
                        >
                            Return to Login
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
