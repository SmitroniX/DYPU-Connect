import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// ---------------------------------------------------------------------------
// Build-safe Firebase initialisation
//
// Problem: Next.js pre-renders static pages (/_not-found, etc.) during the
// build. On Netlify / Vercel build workers the NEXT_PUBLIC_* env vars ARE
// inlined into the *client* JS bundle, but they are NOT available during the
// *server-side* static generation pass. If this module eagerly throws when
// env vars are empty, the build crashes.
//
// Solution: Guard initialisation behind a `canInit` flag. During SSR/build
// (when env vars may be absent) we export safe stubs. At client runtime the
// vars are always present (inlined by Next.js) so Firebase initialises
// normally.
// ---------------------------------------------------------------------------

const firebaseConfig: FirebaseOptions = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "",
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "",
    measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     ?? undefined,
    databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL       ?? undefined,
};

// We can initialise only when at least the API key is a real value
// (not empty, not a placeholder).
const canInit =
    typeof firebaseConfig.apiKey === "string" &&
    firebaseConfig.apiKey.length > 0 &&
    !firebaseConfig.apiKey.startsWith("your_");

// Realtime Database requires a valid URL. If it's empty or the placeholder,
// we don't initialise it to avoid fatal errors.
const canInitRtdb =
    canInit &&
    typeof firebaseConfig.databaseURL === "string" &&
    firebaseConfig.databaseURL.length > 0 &&
    !firebaseConfig.databaseURL.includes("your-project-id");

if (canInit && !getApps().length) {
    initializeApp(firebaseConfig);
}

function getAppSafe() {
    if (!canInit) {
        throw new Error(
            "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* " +
            "environment variables in your hosting dashboard (Netlify / Vercel) " +
            "or in .env.local, then redeploy."
        );
    }
    return getApp();
}

// ---------------------------------------------------------------------------
// Exports
//
// During the build's static-generation phase `canInit` may be false.
// We export `null` stubs so the module evaluates without throwing.
// Every page in this app is `'use client'` — by the time any component
// actually *uses* auth / db / storage it's running in the browser where
// the env vars have been inlined and `canInit` is true.
// ---------------------------------------------------------------------------

export const auth    = canInit ? getAuth(getAppSafe())      : null!;
export const db      = canInit ? getFirestore(getAppSafe()) : null!;
export const storage = canInit ? getStorage(getAppSafe())   : null!;
export const rtdb    = canInitRtdb ? getDatabase(getAppSafe())  : null!;

// Analytics is gated behind cookie consent — only initialised when the
// user has explicitly accepted analytics cookies (GDPR / CrowdStrike
// Falcon-grade privacy controls).
export const analytics =
    typeof window !== "undefined" && canInit
        ? isSupported().then((yes) => {
              if (!yes) return null;
              // Lazy-import to avoid circular deps at module-eval time
              try {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const { isAnalyticsAllowed } = require("@/lib/cookies");
                  if (!isAnalyticsAllowed()) return null;
              } catch {
                  // If cookie lib isn't available, allow analytics as fallback
              }
              return getAnalytics(getAppSafe());
          })
        : null;

export default getAppSafe;
