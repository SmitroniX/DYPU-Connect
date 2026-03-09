'use client';

import { useState, useEffect } from 'react';
import { isAndroidApp, isBiometricAvailable, authenticateBiometric, registerAndroidEventListener } from '@/lib/android';
import { Fingerprint, Lock } from 'lucide-react';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const lockEnabled = localStorage.getItem('dypu_biometric_lock') === 'true';
    
    if (lockEnabled && isAndroidApp()) {
      setIsSupported(true);
      if (isBiometricAvailable()) {
        setIsLocked(true);
        
        // Register listener for auth result
        registerAndroidEventListener((event, data) => {
          if (event === 'biometric_auth_result' && data === 'success') {
            setIsLocked(false);
          }
        });

        // Trigger prompt immediately
        setTimeout(() => {
          authenticateBiometric('Unlock DYPU Connect', 'Authenticate to access your account');
        }, 500);
      }
    }
  }, []);

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[var(--ui-bg)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mb-6 animate-pulse">
          <Lock className="w-10 h-10 text-[var(--ui-accent)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--ui-text)] mb-2">App Locked</h1>
        <p className="text-[var(--ui-text-muted)] mb-8 max-w-xs">
          Biometric authentication is required to access DYPU Connect.
        </p>
        <button
          onClick={() => authenticateBiometric('Unlock DYPU Connect', 'Authenticate to access your account')}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--ui-accent)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <Fingerprint className="w-5 h-5" />
          Try Again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
