'use client';

import { useEffect } from 'react';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Admin panel error:', error);
    }, [error]);

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10">
                    <span className="text-2xl">🛡️</span>
                </div>
                <h2 className="text-xl font-bold text-[var(--ui-text)]">Admin Panel Error</h2>
                <p className="text-sm text-[var(--ui-text-muted)]">
                    Something went wrong loading this admin page.
                </p>
                {error.digest && (
                    <p className="text-xs font-mono text-[var(--ui-text-muted)]">
                        Error ID: {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[var(--ui-accent)] text-white hover:opacity-90 transition-opacity"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}

