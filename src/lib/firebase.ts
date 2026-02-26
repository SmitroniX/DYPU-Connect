import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseEnv = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseEnvKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const missingFirebaseEnvKeys = requiredFirebaseEnvKeys.filter((key) => {
    const value = firebaseEnv[key];
    return typeof value !== "string" || value.trim().length === 0;
});

const placeholderFirebaseEnvKeys = requiredFirebaseEnvKeys.filter((key) => {
    const value = firebaseEnv[key];
    return typeof value === "string" && value.trim().startsWith("your_");
});

if (missingFirebaseEnvKeys.length > 0) {
    throw new Error(
        `Missing Firebase environment variables: ${missingFirebaseEnvKeys.join(", ")}. Add them to .env.local (see .env.example) and restart the Next.js dev server.`
    );
}

if (placeholderFirebaseEnvKeys.length > 0) {
    throw new Error(
        `Firebase environment variables still contain placeholder values: ${placeholderFirebaseEnvKeys.join(", ")}. Replace them with real Firebase project values in .env.local and restart the Next.js dev server.`
    );
}

const firebaseConfig: FirebaseOptions = {
    apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics conditionally (it only works in browser environments)
export const analytics = typeof window !== 'undefined' ?
    isSupported().then(yes => yes ? getAnalytics(app) : null) :
    null;

export default app;
