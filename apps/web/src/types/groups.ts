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
    description?: string;
    avatarUrl?: string;
    type: GroupType;
    hierarchyInfo?: GroupHierarchyInfo;
    memberIds: string[];
    adminIds?: string[];
    createdAt?: Timestamp | null;
    updatedAt?: Timestamp | null;
    lastMessage?: string;
    unreadCount?: Record<string, number>;
    icon?: string;
    isPrivate?: boolean;
    adminId?: string;
}

export type { Message as GroupMessage } from '@/lib/validation/schemas';
