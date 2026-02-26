import { create } from 'zustand';
import { User } from 'firebase/auth';

interface UserProfile {
    userId: string;
    name: string;
    email: string;
    profileImage: string;
    field: string;
    year: string;
    division: string;
    branch?: string;
    role: 'user' | 'admin';
    status: 'active' | 'banned';
    createdAt: number;
}

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
