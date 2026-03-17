import { useEffect, useState, useCallback, useRef } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { useStore } from '@/store/useStore';
import { handleError } from '@/lib/errors';

export function useTypingStatus(chatId: string | undefined) {
    const { currentUser } = useStore();
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Read partner's typing status
    useEffect(() => {
        if (!chatId || !rtdb || !currentUser) return;

        const typingRef = ref(rtdb, `/typing/${chatId}`);
        const unsubscribe = onValue(typingRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Check if anyone OTHER than the current user is typing
                const partnersTyping = Object.keys(data).some(
                    (uid) => uid !== currentUser.uid && data[uid] === true
                );
                setIsPartnerTyping(partnersTyping);
            } else {
                setIsPartnerTyping(false);
            }
        });

        return () => unsubscribe();
    }, [chatId, currentUser]);

    // Handle my own typing status
    const updateTypingStatus = useCallback(
        (isTyping: boolean) => {
            if (!chatId || !rtdb || !currentUser) return;
            const myTypingRef = ref(rtdb, `/typing/${chatId}/${currentUser.uid}`);
            
            if (isTyping) {
                onDisconnect(myTypingRef).set(false).catch((err) => handleError(err, 'useTypingStatus onDisconnect set'));
            } else {
                onDisconnect(myTypingRef).cancel().catch((err) => handleError(err, 'useTypingStatus onDisconnect cancel'));
            }

            set(myTypingRef, isTyping).catch((err) => handleError(err, 'useTypingStatus set'));
        },
        [chatId, currentUser]
    );

    const handleTyping = useCallback(() => {
        updateTypingStatus(true);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            updateTypingStatus(false);
        }, 2000);
    }, [updateTypingStatus]);

    const stopTyping = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        updateTypingStatus(false);
    }, [updateTypingStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (currentUser && rtdb && chatId) {
                const myTypingRef = ref(rtdb, `/typing/${chatId}/${currentUser.uid}`);
                set(myTypingRef, false).catch(() => {});
            }
        };
    }, [chatId, currentUser]);

    return {
        isPartnerTyping,
        handleTyping,
        stopTyping
    };
}
