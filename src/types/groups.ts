import type { Timestamp } from 'firebase/firestore';

export type GroupType = 'field' | 'year' | 'division' | 'custom';

export interface GroupHierarchyInfo {
    field?: string;
    year?: string;
    division?: string;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    avatarUrl?: string;
    type: GroupType;
    hierarchyInfo?: GroupHierarchyInfo;
    memberIds: string[];
    adminIds: string[];
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
    lastMessage?: string;
    unreadCount?: Record<string, number>;
}

export interface GroupMessage {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
    senderImage?: string;
    gifUrl?: string;
    imageUrl?: string;
    audioUrl?: string;
    reactions?: Record<string, string[]>;
    timestamp: Timestamp | null;
    isEdited?: boolean;
    isDeleted?: boolean;
    replyToId?: string;
}
