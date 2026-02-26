'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    sendLoginLink: (email: string) => Promise<void>;
    verifyLoginLink: (email: string, link: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { setCurrentUser, setUserProfile } = useStore();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setCurrentUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user profile from Firestore
                const docRef = doc(db, 'users', firebaseUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setUserProfile(docSnap.data() as any);
                } else {
                    // If no profile exists, they might need to be redirected to profile setup
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setCurrentUser, setUserProfile]);

    const sendLoginLink = async (email: string) => {
        if (!email.endsWith('@dypatil.edu')) {
            throw new Error('Only @dypatil.edu emails are allowed.');
        }

        // For local dev, Firebase auth domain might not be set. Using localhost for Action Code Setting.
        const actionCodeSettings = {
            url: window.location.origin + '/verify-email',
            handleCodeInApp: true,
        };

        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
    };

    const verifyLoginLink = async (email: string, link: string) => {
        if (isSignInWithEmailLink(auth, link)) {
            await signInWithEmailLink(auth, email, link);
            window.localStorage.removeItem('emailForSignIn');
        } else {
            throw new Error('Invalid sign-in link.');
        }
    };

    const logout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, sendLoginLink, verifyLoginLink, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
