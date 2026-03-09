import { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { useStore } from '@/store/useStore';

export interface UserPresence {
    state: 'online' | 'offline';
    last_changed: number;
}

/**
 * Global hook to track the current user's connection state and update 
 * Firebase Realtime Database with their 'online' or 'offline' status.
 */
export function usePresence() {
    const { currentUser } = useStore();

    useEffect(() => {
        if (!currentUser?.uid || !rtdb) return;

        const uid = currentUser.uid;
        const userStatusDatabaseRef = ref(rtdb, `/status/${uid}`);
        const connectedRef = ref(rtdb, '.info/connected');

        const isOfflineForDatabase = {
            state: 'offline',
            last_changed: serverTimestamp(),
        };

        const isOnlineForDatabase = {
            state: 'online',
            last_changed: serverTimestamp(),
        };

        const unsubscribe = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // When connected, set up the onDisconnect hook
                onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                    // Then set the state to online
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                });
            }
        });

        // Cleanup function
        return () => {
            unsubscribe();
            // Try to set offline when unmounting, though onDisconnect handles the connection dropping
            if (rtdb) {
                set(userStatusDatabaseRef, isOfflineForDatabase).catch(console.error);
            }
        };
    }, [currentUser]);
}

/**
 * Hook to read a specific user's presence status in real-time.
 */
export function useUserPresence(uid: string | undefined): UserPresence | null {
    const [presence, setPresence] = useState<UserPresence | null>(null);

    useEffect(() => {
        if (!uid || !rtdb) {
            setPresence(null);
            return;
        }

        const userStatusRef = ref(rtdb, `/status/${uid}`);
        const unsubscribe = onValue(userStatusRef, (snapshot) => {
            if (snapshot.exists()) {
                setPresence(snapshot.val() as UserPresence);
            } else {
                setPresence(null);
            }
        });

        return () => unsubscribe();
    }, [uid]);

    return presence;
}
