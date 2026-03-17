/**
 * Utility to communicate with the native Android app via JavascriptInterface
 */

interface AndroidInterface {
  showToast(message: string): void;
  vibrate(duration: number): void;
  share(text: string, title: string): void;
  getAppVersion(): string;
  getFCMToken(): void;
  onWebReady(): void;
  isBiometricAvailable(): boolean;
  authenticateBiometric(title: string, subtitle: string): void;
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
 * Registers a listener for events coming from the native Android app
 */
export const registerAndroidEventListener = (callback: (event: string, data: string) => void) => {
  if (typeof window !== 'undefined') {
    window.onAndroidEvent = callback;
  }
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
 * Checks if biometric authentication is available on the device
 */
export const isBiometricAvailable = (): boolean => {
  return window.AndroidApp ? window.AndroidApp.isBiometricAvailable() : false;
};

/**
 * Starts biometric authentication
 */
export const authenticateBiometric = (title: string = 'Security Check', subtitle: string = 'Authenticate to continue') => {
  if (window.AndroidApp) {
    window.AndroidApp.authenticateBiometric(title, subtitle);
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
