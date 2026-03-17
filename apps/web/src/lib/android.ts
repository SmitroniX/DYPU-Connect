/**
 * Global registry for Android events to support multiple listeners.
 */
const listeners: Set<(event: string, data: string) => void> = new Set();

/**
 * Internal handler assigned to window.onAndroidEvent
 */
const _handleAndroidEvent = (event: string, data: string) => {
  console.log(`[Android Bridge] Routing event: ${event}`, data);
  listeners.forEach(listener => {
    try {
      listener(event, data);
    } catch (e) {
      console.error('[Android Bridge] Listener error:', e);
    }
  });
};

/**
 * Utility to communicate with the native Android app via JavascriptInterface
 */

interface AndroidInterface {
  showToast(message: string): void;
  vibrate(duration: number): void;
  share(text: string, title: string): void;
  getAppVersion(): string;
  getFCMToken(): void;
  signInWithGoogle(): void;
  onWebReady(): void;
}

declare global {
  interface Window {
    AndroidApp?: AndroidInterface;
    onAndroidEvent?: (event: string, data: string) => void;
  }
}

/**
 * Checks if the app is running inside the native Android WebView
 */
export const isAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.AndroidApp;
};

/**
 * Notifies the native app that the web side is ready to receive events
 */
export const notifyWebReady = () => {
  if (window.AndroidApp?.onWebReady) {
    window.AndroidApp.onWebReady();
  }
};

/**
 * Registers a listener for events coming from the native Android app.
 * Returns an unsubscribe function.
 */
export const registerAndroidEventListener = (callback: (event: string, data: string) => void) => {
  if (typeof window === 'undefined') return () => {};

  // Initialize the global handler if not already present
  if (!window.onAndroidEvent) {
    window.onAndroidEvent = _handleAndroidEvent;
  }

  listeners.add(callback);
  
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Shows a native Android toast message
 */
export const showToast = (message: string) => {
  if (window.AndroidApp) {
    window.AndroidApp.showToast(message);
  } else {
    console.log('Android Toast:', message);
  }
};

/**
 * Vibrates the device for a specified duration (in milliseconds)
 */
export const vibrate = (duration: number = 50) => {
  if (window.AndroidApp) {
    window.AndroidApp.vibrate(duration);
  } else {
    console.log('Android Vibrate:', duration, 'ms');
  }
};

/**
 * Opens the native Android share sheet
 */
export const shareToAndroid = (text: string, title: string = 'Share via') => {
  if (window.AndroidApp) {
    window.AndroidApp.share(text, title);
  } else if (navigator.share) {
    navigator.share({ title, text }).catch(console.error);
  } else {
    console.log('Android Share:', title, text);
  }
};

/**
 * Triggers native Google Sign-In on Android
 */
export const triggerNativeGoogleSignIn = () => {
  if (window.AndroidApp?.signInWithGoogle) {
    window.AndroidApp.signInWithGoogle();
  }
};

/**
 * Requests the FCM token from the native app. 
 * The app will respond via the 'fcm_token_ready' event.
 */
export const requestFCMToken = () => {
  if (window.AndroidApp?.getFCMToken) {
    window.AndroidApp.getFCMToken();
  }
};

/**
 * Gets the native app version
 */
export const getAppVersion = (): string | null => {
  return window.AndroidApp ? window.AndroidApp.getAppVersion() : null;
};
