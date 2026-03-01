import { create } from 'zustand';
import { User } from 'firebase/auth';
import type { UserProfile } from '@/types/profile';

interface AppState {
    currentUser: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
    /** Short-lived Google OAuth access token (in-memory only, not persisted) */
    driveAccessToken: string | null;
    setCurrentUser: (user: User | null) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    setDriveAccessToken: (token: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
    currentUser: null,
    userProfile: null,
    isLoading: true,
    driveAccessToken: null,
    setCurrentUser: (user) => set({ currentUser: user }),
    setUserProfile: (profile) => set({ userProfile: profile }),
    setLoading: (loading) => set({ isLoading: loading }),
    setDriveAccessToken: (token) => set({ driveAccessToken: token }),
}));
