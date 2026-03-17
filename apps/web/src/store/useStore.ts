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
    /** Count of unread chat messages */
    unreadMessagesCount: number;
    /** Count of unread group chat messages */
    unreadGroupsCount: number;
    /** Count of unread notifications */
    unreadCount: number;
    /** Whether the notification panel is open */
    notificationPanelOpen: boolean;
    /** Whether the global search modal is open */
    searchModalOpen: boolean;
    /** Data shared from external apps (e.g. Android SEND intent) */
    sharedData: { type: 'text' | 'image', data: string } | null;
    setCurrentUser: (user: User | null) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    setDriveAccessToken: (token: string | null) => void;
    setNotifications: (notifications: AppNotification[]) => void;
    setUnreadMessagesCount: (count: number) => void;
    setUnreadGroupsCount: (count: number) => void;
    setNotificationPanelOpen: (open: boolean) => void;
    setSearchModalOpen: (open: boolean) => void;
    setSharedData: (data: { type: 'text' | 'image', data: string } | null) => void;
}

export const useStore = create<AppState>((set) => ({
    currentUser: null,
    userProfile: null,
    isLoading: true,
    driveAccessToken: null,
    notifications: [],
    unreadCount: 0,
    unreadMessagesCount: 0,
    unreadGroupsCount: 0,
    notificationPanelOpen: false,
    searchModalOpen: false,
    sharedData: null,
    setCurrentUser: (user) => set({ currentUser: user }),
    setUserProfile: (profile) => set({ userProfile: profile }),
    setLoading: (loading) => set({ isLoading: loading }),
    setDriveAccessToken: (token) => set({ driveAccessToken: token }),
    setNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
        }),
    setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
    setUnreadGroupsCount: (count) => set({ unreadGroupsCount: count }),
    setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
    setSearchModalOpen: (open) => set({ searchModalOpen: open }),
    setSharedData: (sharedData) => set({ sharedData }),
}));
