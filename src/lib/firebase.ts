import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ---------------------------------------------------------------------------
// Build-safe Firebase initialisation
//
// During Next.js static page generation (e.g. /_not-found) on Netlify / Vercel,
// NEXT_PUBLIC_* env vars may not be present. We skip initialisation in that
// case so the build never crashes. The validation still runs at runtime in the
// browser — if env vars are missing the app will show a clear error.
// ---------------------------------------------------------------------------

const requiredEnvKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function readEnv(key: string): string {
    return (process.env[key] ?? "").trim();
}

/** True when all required env vars are present and non-placeholder. */
function hasValidEnv(): boolean {
    return requiredEnvKeys.every((k) => {
        const v = readEnv(k);
        return v.length > 0 && !v.startsWith("your_");
    });
}

/** Throws a descriptive error — called only at runtime (in the browser). */
function assertEnv(): void {
    const missing = requiredEnvKeys.filter((k) => readEnv(k).length === 0);
    if (missing.length > 0) {
        throw new Error(
            `Missing Firebase environment variables: ${missing.join(", ")}. ` +
            `Add them to .env.local (see .env.example) and restart the dev server.`
        );
    }
    const placeholders = requiredEnvKeys.filter((k) => readEnv(k).startsWith("your_"));
    if (placeholders.length > 0) {
        throw new Error(
            `Firebase environment variables still contain placeholder values: ${placeholders.join(", ")}. ` +
            `Replace them with real Firebase project values in .env.local and restart the dev server.`
        );
    }
}

// ---------------------------------------------------------------------------
// Initialise only when env is available (skipped during static generation)
// ---------------------------------------------------------------------------

const canInit = hasValidEnv();

if (canInit) {
    // Eagerly initialise so that `auth`, `db`, `storage` are real SDK objects.
    const firebaseConfig: FirebaseOptions = {
        apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
        authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
        projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
        storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
        appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
        measurementId: readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") || undefined,
    };

    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
}

// Helper that returns the app or throws a clear runtime error.
function app() {
    if (!canInit) {
        assertEnv(); // will throw with a descriptive message
    }
    return getApp();
}

export const auth = canInit ? getAuth(getApp()) : (null as unknown as ReturnType<typeof getAuth>);
export const db = canInit ? getFirestore(getApp()) : (null as unknown as ReturnType<typeof getFirestore>);
export const storage = canInit ? getStorage(getApp()) : (null as unknown as ReturnType<typeof getStorage>);

// Initialize Analytics conditionally (browser-only)
export const analytics =
    typeof window !== "undefined" && canInit
        ? isSupported().then((yes) => (yes ? getAnalytics(getApp()) : null))
        : null;

export default app;
