import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SystemSettings {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    disableConfessions: boolean;
    disableAnonymousChat: boolean;
    disablePublicChat: boolean;
    disableGroups: boolean;
    bannedKeywords: string[];
}

interface SystemStore {
    settings: SystemSettings | null;
    isInitializing: boolean;
    initSystemListener: () => () => void;
}

const DEFAULT_SETTINGS: SystemSettings = {
    maintenanceMode: false,
    maintenanceMessage: 'The system is currently undergoing scheduled maintenance. Please check back later.',
    disableConfessions: false,
    disableAnonymousChat: false,
    disablePublicChat: false,
    disableGroups: false,
    bannedKeywords: [],
};

export const useSystemStore = create<SystemStore>((set) => ({
    settings: null,
    isInitializing: true,
    initSystemListener: () => {
        const docRef = doc(db, 'system_settings', 'global');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                set({ settings: docSnap.data() as SystemSettings, isInitializing: false });
            } else {
                set({ settings: DEFAULT_SETTINGS, isInitializing: false });
            }
        }, (error) => {
            console.error('System settings listener error:', error);
            set({ settings: DEFAULT_SETTINGS, isInitializing: false });
        });

        return unsubscribe;
    }
}));
