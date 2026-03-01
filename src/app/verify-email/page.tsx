'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page previously handled email-link verification.
 * Since we now use Google sign-in only, redirect to login.
 */
export default function VerifyEmailPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-base)]">
            <p className="text-sm text-[var(--ui-text-muted)]">Redirecting to login...</p>
        </div>
    );
}
