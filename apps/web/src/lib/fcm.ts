import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Request notification permission and get the FCM token.
 */
export async function requestPushPermission(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    // Check if browser supports push messaging
    if (!('Notification' in window)) {
        console.warn('[FCM] This browser does not support desktop notification');
        return null;
    }

    const supported = await isSupported();
    if (!supported) {
        console.warn('[FCM] FCM is not supported in this environment');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const messaging = getMessaging(getApp());
            
            // Check if service worker is ready first
            const registration = await navigator.serviceWorker.ready;
            
            const currentToken = await getToken(messaging, { 
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration,
            });
            
            if (currentToken) {
                return currentToken;
            } else {
                console.warn('[FCM] No registration token available.');
                return null;
            }
        } else {
            console.warn('[FCM] Notification permission denied.');
            return null;
        }
    } catch (error) {
        console.warn('[FCM] An error occurred while retrieving token:', error);
        return null;
    }
}

/**
 * Setup and link the token to the user profile
 */
export async function setupPushNotifications(userId: string) {
    if (!userId) return false;
    try {
        const currentToken = await requestPushPermission();
        if (currentToken) {
            await updateDoc(doc(db, 'users', userId), {
                fcmToken: currentToken
            });
            console.log('[FCM] Push token registered successfully.');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[FCM] Failed to setup push notifications:', error);
        return false;
    }
}

/**
 * Set up a foreground listener for messages that arrive while the app is actively open and focused.
 * The background listener is handled entirely by `firebase-messaging-sw.js`.
 */
export async function onForegroundMessage(callback: (payload: MessagePayload) => void) {
    if (typeof window === 'undefined') return;
    const supported = await isSupported();
    if (!supported) return;

    try {
        const messaging = getMessaging(getApp());
        return onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message received: ', payload);
            callback(payload);
        });
    } catch {
        // usually failing here means missing config or permissions not granted yet
    }
}
