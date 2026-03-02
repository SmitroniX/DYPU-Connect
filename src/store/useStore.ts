import { create } from 'zustand';
import { User } from 'firebase/auth';
import type { UserProfile } from '@/types/profile';
import type { AppNotification } from '@/lib/notifications';

interface AppState {
    currentUser: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
    /** Short-lived Google OAuth access token (in-memory only, not persisted) */
    driveAccessToken: string | null;
    /** Real-time notifications list (most recent first) */
    notifications: AppNotification[];
    /** Count of unread notifications */
    unreadCount: number;
    /** Whether the notification panel is open */
    notificationPanelOpen: boolean;
    setCurrentUser: (user: User | null) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    setDriveAccessToken: (token: string | null) => void;
    setNotifications: (notifications: AppNotification[]) => void;
    setNotificationPanelOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    currentUser: null,
    userProfile: null,
    isLoading: true,
    driveAccessToken: null,
    notifications: [],
    unreadCount: 0,
    notificationPanelOpen: false,
    setCurrentUser: (user) => set({ currentUser: user }),
    setUserProfile: (profile) => set({ userProfile: profile }),
    setLoading: (loading) => set({ isLoading: loading }),
    setDriveAccessToken: (token) => set({ driveAccessToken: token }),
    setNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
        }),
    setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
}));
