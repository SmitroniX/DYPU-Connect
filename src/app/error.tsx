'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-base)] px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] pr-[calc(1.5rem+env(safe-area-inset-right))]">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-bold text-[var(--ui-text)]">Something went wrong</h1>
                <p className="text-sm text-[var(--ui-text-muted)] leading-relaxed">
                    An unexpected error occurred. This has been logged automatically.
                </p>
                {error.digest && (
                    <p className="text-xs font-mono text-[var(--ui-text-muted)]">
                        Error ID: {error.digest}
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[var(--ui-accent)] text-white hover:opacity-90 transition-opacity"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-elevated)] transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}

