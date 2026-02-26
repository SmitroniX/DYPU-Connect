import { create } from 'zustand';
import { User } from 'firebase/auth';
import type { UserProfile } from '@/types/profile';

interface AppState {
    currentUser: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
    setCurrentUser: (user: User | null) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    currentUser: null,
    userProfile: null,
    isLoading: true,
    setCurrentUser: (user) => set({ currentUser: user }),
    setUserProfile: (profile) => set({ userProfile: profile }),
    setLoading: (loading) => set({ isLoading: loading }),
}));
