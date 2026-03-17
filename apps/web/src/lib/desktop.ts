/**
 * Utility to communicate with the native Desktop (Electron) app via contextBridge
 */

interface ElectronInterface {
  onAuthCallback(callback: (url: string) => void): void;
  getAppVersion(): Promise<string>;
  vibrate(): void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electron?: ElectronInterface;
  }
}

/**
 * Checks if the app is running inside the Electron desktop wrapper
 */
export const isDesktopApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.electron;
};

/**
 * Registers a listener for deep link auth callbacks (dypu-connect://)
 */
export const registerAuthCallback = (callback: (url: string) => void) => {
  if (window.electron) {
    window.electron.onAuthCallback(callback);
  }
};

/**
 * Gets the native desktop app version
 */
export const getDesktopVersion = async (): Promise<string | null> => {
  if (window.electron) {
    return await window.electron.getAppVersion();
  }
  return null;
};

/**
 * Native feedback - flashes the taskbar icon on Windows
 */
export const flashTaskbar = () => {
  if (window.electron) {
    window.electron.vibrate();
  }
};
