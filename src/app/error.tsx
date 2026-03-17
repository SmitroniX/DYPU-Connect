'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-base)] px-6 py-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-md w-full text-center space-y-8"
            >
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <motion.div
                        animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-[var(--ui-danger)] rounded-full"
                    />
                    <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--ui-danger)]/10 text-[var(--ui-danger)]">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[var(--ui-text)] tracking-tight">Something went wrong</h1>
                    <p className="text-[var(--ui-text-muted)] leading-relaxed">
                        An unexpected error occurred. Our team has been notified and we're working on a fix.
                    </p>
                </div>

                {error.digest && (
                    <div className="p-3 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-divider)]">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--ui-text-muted)] mb-1">
                            Error Reference
                        </p>
                        <code className="text-xs font-mono text-[var(--ui-accent)] break-all">
                            {error.digest}
                        </code>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={reset}
                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-2xl bg-[var(--ui-accent)] text-white hover:opacity-90 transition-all shadow-lg shadow-[var(--ui-accent)]/20"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Try Again
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => window.location.href = '/'}
                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-2xl border border-[var(--ui-divider)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] transition-all"
                    >
                        <Home className="w-4 h-4" />
                        Go Home
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

