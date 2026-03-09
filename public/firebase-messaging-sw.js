// Import the FCM compat scripts from CDN to avoid build dependencies in the `public` dir
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// 1. Extract Firebase config from the URL query params
// (Injected dynamically from `navigator.serviceWorker.register` in src/lib/fcm.ts)
const urlParams = new URLSearchParams(location.search);

const firebaseConfig = {
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId')
};

// 2. Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// 3. Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// 4. Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message on DYPU Connect.',
        // We use our app's logo icon if no custom image is sent
        icon: payload.notification?.image || '/logo.png',
        badge: '/icons/icon-72x72.png', // Small monochrome status bar icon (PWA)
        vibrate: [200, 100, 200], // Haptic feedback sequence
        data: payload.data, // Custom data payload (e.g. { url: '/messages/chatId' })
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 5. Native click action (opens the app when tapped from notification tray)
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.', event);
    event.notification.close();

    const data = event.notification.data;
    const urlToOpen = (data && data.url) ? data.url : '/';

    // Search for an already open DYPU Connect window and focus it, or open a new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // If so, just focus it
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
