import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerAndroidEventListener,
  isAndroidApp,
  notifyWebReady,
  showToast,
  vibrate,
  shareToAndroid,
  triggerNativeGoogleSignIn,
  requestFCMToken,
  getAppVersion,
} from './android';

describe('Android Bridge', () => {
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalWindow = { ...window };
    // Clear android app from window
    delete window.AndroidApp;
    delete window.onAndroidEvent;

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.AndroidApp = originalWindow.AndroidApp;
    window.onAndroidEvent = originalWindow.onAndroidEvent;
  });

  describe('isAndroidApp', () => {
    it('returns false when AndroidApp is not in window', () => {
      expect(isAndroidApp()).toBe(false);
    });

    it('returns true when AndroidApp is in window', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = {} as any;
      expect(isAndroidApp()).toBe(true);
    });
  });

  describe('notifyWebReady', () => {
    it('does nothing if AndroidApp is missing', () => {
      expect(() => notifyWebReady()).not.toThrow();
    });

    it('calls AndroidApp.onWebReady if available', () => {
      const onWebReady = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { onWebReady } as any;
      notifyWebReady();
      expect(onWebReady).toHaveBeenCalled();
    });
  });

  describe('registerAndroidEventListener', () => {
    it('assigns window.onAndroidEvent on first call', () => {
      expect(window.onAndroidEvent).toBeUndefined();
      const unsubscribe = registerAndroidEventListener(vi.fn());
      expect(window.onAndroidEvent).toBeDefined();
      unsubscribe();
    });

    it('dispatches events to registered listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = registerAndroidEventListener(listener1);
      const unsubscribe2 = registerAndroidEventListener(listener2);

      window.onAndroidEvent!('TEST_EVENT', 'data');

      expect(listener1).toHaveBeenCalledWith('TEST_EVENT', 'data');
      expect(listener2).toHaveBeenCalledWith('TEST_EVENT', 'data');

      unsubscribe1();
      unsubscribe2();
    });

    it('stops dispatching after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = registerAndroidEventListener(listener);

      unsubscribe();
      window.onAndroidEvent!('TEST_EVENT', 'data');

      expect(listener).not.toHaveBeenCalled();
    });

    it('handles listener errors without crashing others', () => {
      const badListener = vi.fn().mockImplementation(() => { throw new Error('Bad listener'); });
      const goodListener = vi.fn();

      const unsubscribe1 = registerAndroidEventListener(badListener);
      const unsubscribe2 = registerAndroidEventListener(goodListener);

      expect(() => window.onAndroidEvent!('TEST_EVENT', 'data')).not.toThrow();

      expect(badListener).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('showToast', () => {
    it('calls AndroidApp.showToast if available', () => {
      const showToastSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { showToast: showToastSpy } as any;
      showToast('hello');
      expect(showToastSpy).toHaveBeenCalledWith('hello');
    });

    it('logs to console if AndroidApp is missing', () => {
      showToast('hello');
      expect(console.log).toHaveBeenCalledWith('Android Toast:', 'hello');
    });
  });

  describe('vibrate', () => {
    it('calls AndroidApp.vibrate if available', () => {
      const vibrateSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { vibrate: vibrateSpy } as any;
      vibrate(100);
      expect(vibrateSpy).toHaveBeenCalledWith(100);
    });

    it('uses default duration of 50ms', () => {
      const vibrateSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { vibrate: vibrateSpy } as any;
      vibrate();
      expect(vibrateSpy).toHaveBeenCalledWith(50);
    });

    it('logs to console if AndroidApp is missing', () => {
      vibrate(100);
      expect(console.log).toHaveBeenCalledWith('Android Vibrate:', 100, 'ms');
    });
  });

  describe('shareToAndroid', () => {
    it('calls AndroidApp.share if available', () => {
      const shareSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { share: shareSpy } as any;
      shareToAndroid('text', 'title');
      expect(shareSpy).toHaveBeenCalledWith('text', 'title');
    });

    it('calls navigator.share if AndroidApp is missing but navigator.share is available', () => {
      const originalNavigator = global.navigator;
      const shareSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, 'navigator', {
        value: { share: shareSpy },
        writable: true
      });

      shareToAndroid('text', 'title');
      expect(shareSpy).toHaveBeenCalledWith({ title: 'title', text: 'text' });

      global.navigator = originalNavigator;
    });

    it('logs to console if neither is available', () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      shareToAndroid('text', 'title');
      expect(console.log).toHaveBeenCalledWith('Android Share:', 'title', 'text');

      global.navigator = originalNavigator;
    });
  });

  describe('triggerNativeGoogleSignIn', () => {
    it('calls AndroidApp.signInWithGoogle if available', () => {
      const signInSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { signInWithGoogle: signInSpy } as any;
      triggerNativeGoogleSignIn();
      expect(signInSpy).toHaveBeenCalled();
    });

    it('does nothing if AndroidApp is missing', () => {
      expect(() => triggerNativeGoogleSignIn()).not.toThrow();
    });
  });

  describe('requestFCMToken', () => {
    it('calls AndroidApp.getFCMToken if available', () => {
      const getTokenSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { getFCMToken: getTokenSpy } as any;
      requestFCMToken();
      expect(getTokenSpy).toHaveBeenCalled();
    });

    it('does nothing if AndroidApp is missing', () => {
      expect(() => requestFCMToken()).not.toThrow();
    });
  });

  describe('getAppVersion', () => {
    it('returns AndroidApp.getAppVersion if available', () => {
      const getVersionSpy = vi.fn().mockReturnValue('1.0.0');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AndroidApp = { getAppVersion: getVersionSpy } as any;
      expect(getAppVersion()).toBe('1.0.0');
    });

    it('returns null if AndroidApp is missing', () => {
      expect(getAppVersion()).toBeNull();
    });
  });
});
