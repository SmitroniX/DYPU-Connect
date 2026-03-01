'use client';

import { useEffect } from 'react';
import { validateSessionIntegrity, panicWipeCookies } from '@/lib/cookieShield';
import { useAuth } from '@/components/AuthProvider';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// SessionGuard — Anti-cookie-sniffing runtime monitor
//
// Runs on every page load. Detects browser fingerprint mismatches which
// indicate a stolen cookie being replayed from a different machine.
// On detection: wipes all cookies, signs the user out, shows alert.
// ---------------------------------------------------------------------------

export default function SessionGuard() {
    const { logout, user } = useAuth();

    useEffect(() => {
        if (!user) return; // Only check for signed-in users

        const result = validateSessionIntegrity();

        if (!result.valid) {
            console.error('[SessionGuard]', result.reason);

            // Wipe everything
            panicWipeCookies();

            // Force sign out
            toast.error('Session security violation detected. You have been signed out for your protection.', {
                duration: 6000,
                icon: '🛡️',
            });

            // Small delay to let the toast show before redirect
            setTimeout(() => {
                logout();
            }, 1500);
        }
    }, [user, logout]);

    return null; // Invisible component
}

