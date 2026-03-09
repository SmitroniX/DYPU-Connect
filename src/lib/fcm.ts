import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Request Notification permissions and register the device for FCM push notifications.
 * It manually registers the service worker to pass Firebase config as URL parameters,
 * avoiding the need to hardcode the API keys in `public/firebase-messaging-sw.js`.
 */
export async function requestPushPermission(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
        const supported = await isSupported();
        if (!supported) {
            console.warn('[FCM] Push notifications are not supported in this browser environment.');
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[FCM] Permission denied by user.');
            return false;
        }

        const messaging = getMessaging(getApp());

        // Extract env vars ensuring they fall back to empty strings rather than undefined
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        };

        const params = new URLSearchParams(firebaseConfig as Record<string, string>).toString();
        const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`);

        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, // Optional but required for Web Push payload routing
            serviceWorkerRegistration: registration,
        });

        if (currentToken) {
            // Save token to the user's profile document so backend listeners/functions can target it
            await updateDoc(doc(db, 'users', userId), {
                fcmToken: currentToken
            });
            console.log('[FCM] Push token registered successfully.');
            return true;
        } else {
            console.warn('[FCM] No registration token available.');
            return false;
        }
    } catch (error) {
        console.warn('[FCM] Failed to get FCM token:', error);
        return false;
    }
}

/**
 * Set up a foreground listener for messages that arrive while the app is actively open and focused.
 * The background listener is handled entirely by `firebase-messaging-sw.js`.
 */
export async function onForegroundMessage(callback: (payload: any) => void) {
    if (typeof window === 'undefined') return;
    const supported = await isSupported();
    if (!supported) return;

    try {
        const messaging = getMessaging(getApp());
        return onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message received: ', payload);
            callback(payload);
        });
    } catch (error) {
        // usually failing here means missing config or permissions not granted yet
    }
}
