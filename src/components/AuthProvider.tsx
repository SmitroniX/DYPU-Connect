'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, GoogleAuthProvider, signInWithPopup, OAuthProvider, deleteUser } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { normalizeUserProfile, type UserProfile } from '@/types/profile';
import { isAutoAdminEmail } from '@/lib/admin';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    sendLoginLink: (email: string) => Promise<void>;
    verifyLoginLink: (email: string, link: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function mapFirestoreError(error: unknown): Error {
    const firebaseError = error as FirebaseError | undefined;

    switch (firebaseError?.code) {
        case 'permission-denied':
            return new Error(
                'Firestore access denied. Update Firestore Rules to allow this signed-in user to read/write their own profile document.'
            );
        default:
            return error instanceof Error ? error : new Error('Failed to access Firestore.');
    }
}

function mapAuthError(error: unknown): Error {
    const firebaseError = error as FirebaseError | undefined;

    switch (firebaseError?.code) {
        case 'auth/operation-not-allowed':
            return new Error(
                'Email link sign-in is disabled. In Firebase Console, go to Authentication -> Sign-in method -> Email/Password and enable Email link (passwordless sign-in).'
            );
        case 'auth/unauthorized-domain':
            return new Error(
                'This domain is not authorized for Firebase Auth. Add it under Authentication -> Settings -> Authorized domains.'
            );
        case 'auth/firebase-app-check-token-is-invalid':
            return new Error(
                'Firebase App Check token is invalid. Configure App Check for this web app or disable Auth App Check enforcement in Firebase Console during development.'
            );
        default:
            return error instanceof Error ? error : new Error('Authentication failed.');
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { setCurrentUser, setUserProfile, setLoading: setStoreLoading, setDriveAccessToken } = useStore();
    const router = useRouter();

    // Guard: if Firebase wasn't initialised (env vars missing at build time)
    // show an error screen instead of crashing.
    const firebaseReady = auth !== null && db !== null;

    useEffect(() => {
        if (!firebaseReady) {
            const id = requestAnimationFrame(() => {
                setLoading(false);
                setStoreLoading(false);
            });
            return () => cancelAnimationFrame(id);
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setCurrentUser(firebaseUser);

            if (firebaseUser) {
                try {
                    // Fetch user profile from Firestore
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const rawProfile = docSnap.data() as UserProfile;
                        const profile = normalizeUserProfile(rawProfile);

                        const profileUpdates: Partial<UserProfile> = {};
                        const needsNormalization =
                            rawProfile.gender !== profile.gender
                            || rawProfile.accountVisibility !== profile.accountVisibility
                            || !Array.isArray(rawProfile.gallery)
                            || !Array.isArray(rawProfile.stories)
                            || !Array.isArray(rawProfile.highlights);

                        if (isAutoAdminEmail(firebaseUser.email) && profile.role !== 'admin') {
                            profileUpdates.role = 'admin';
                            profile.role = 'admin';
                        }

                        if (needsNormalization) {
                            profileUpdates.gender = profile.gender;
                            profileUpdates.accountVisibility = profile.accountVisibility;
                            profileUpdates.gallery = profile.gallery;
                            profileUpdates.stories = profile.stories;
                            profileUpdates.highlights = profile.highlights;
                        }

                        if (Object.keys(profileUpdates).length > 0) {
                            await updateDoc(docRef, profileUpdates);
                        }

                        setUserProfile(profile);
                    } else {
                        // If no profile exists, they might need to be redirected to profile setup
                        setUserProfile(null);
                    }
                } catch (error) {
                    const mappedError = mapFirestoreError(error);
                    console.error(mappedError.message);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
            setStoreLoading(false);
        });

        return () => unsubscribe();
    }, [firebaseReady, setCurrentUser, setUserProfile, setStoreLoading]);

    const sendLoginLink = async (email: string) => {
        if (!email.endsWith('@dypatil.edu')) {
            throw new Error('Only @dypatil.edu emails are allowed.');
        }

        // For local dev, Firebase auth domain might not be set. Using localhost for Action Code Setting.
        const actionCodeSettings = {
            url: window.location.origin + '/verify-email',
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
        } catch (error) {
            throw mapAuthError(error);
        }
    };

    const verifyLoginLink = async (email: string, link: string) => {
        if (!isSignInWithEmailLink(auth, link)) {
            throw new Error('Invalid sign-in link.');
        }

        try {
            await signInWithEmailLink(auth, email, link);
            window.localStorage.removeItem('emailForSignIn');
        } catch (error) {
            throw mapAuthError(error);
        }
    };

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        // Request Drive file-level access + profile info in one consent screen
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ hd: 'dypatil.edu', prompt: 'consent' });

        try {
            const result = await signInWithPopup(auth, provider);
            const email = result.user.email;

            // Enforce @dypatil.edu restriction
            if (!email || !email.endsWith('@dypatil.edu')) {
                // Delete the just-created Firebase account for non-dypatil emails
                await deleteUser(result.user).catch(() => {});
                await signOut(auth);
                throw new Error('Only @dypatil.edu Google accounts are allowed. Please use your university email.');
            }

            // Extract the Google OAuth access token (includes Drive scope)
            const credential = OAuthProvider.credentialFromResult(result);
            const accessToken = (credential as unknown as { accessToken?: string })?.accessToken
                || (result as unknown as { _tokenResponse?: { oauthAccessToken?: string } })?._tokenResponse?.oauthAccessToken
                || null;

            if (accessToken) {
                setDriveAccessToken(accessToken);

                // Auto-connect Google Drive on the user's Firestore profile (if it exists)
                try {
                    const docRef = doc(db, 'users', result.user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const existing = docSnap.data() as UserProfile;
                        if (!existing.googleDrive) {
                            await updateDoc(docRef, {
                                googleDrive: {
                                    email: email,
                                    connectedAt: Date.now(),
                                },
                            });
                        }
                    }
                } catch {
                    // Non-critical — Drive connection will be saved when profile is created
                }
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('@dypatil.edu')) {
                throw error;
            }
            throw mapAuthError(error);
        }
    };

    const logout = async () => {
        setDriveAccessToken(null);
        await signOut(auth);
        router.push('/login');
    };

    if (!firebaseReady) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] px-6 text-center gap-5">
                <h1 className="text-2xl font-bold text-red-400">⚠ Firebase Not Configured</h1>
                <p className="text-slate-400 max-w-lg">
                    The <code className="text-sky-300">NEXT_PUBLIC_FIREBASE_*</code> environment
                    variables were not found at build time. Since these are inlined during the build,
                    you must set them <strong className="text-slate-300">before</strong> deploying.
                </p>
                <div className="text-left bg-white/5 border border-white/10 rounded-xl p-5 max-w-lg w-full">
                    <p className="text-sm font-semibold text-slate-300 mb-3">Required in your hosting dashboard:</p>
                    <ul className="text-xs text-slate-500 space-y-1 font-mono">
                        <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                        <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                        <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                        <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                        <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
                        <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
                    </ul>
                </div>
                <p className="text-xs text-slate-600 max-w-lg">
                    Netlify → Site configuration → Environment variables &nbsp;|&nbsp;
                    Vercel → Settings → Environment Variables.
                    After adding them, <strong>trigger a new deploy</strong>.
                </p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, sendLoginLink, verifyLoginLink, signInWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
