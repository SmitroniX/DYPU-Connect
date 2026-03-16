import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Custom Zod validator for Firebase Timestamps.
 * Accepts Timestamp instances or Firestore's internal JSON representation.
 */
export const firebaseTimestampSchema = z.custom<Timestamp>((val) => {
    return val instanceof Timestamp || (typeof val === 'object' && val !== null && 'seconds' in val && 'nanoseconds' in val);
}, {
    message: "Expected a Firebase Timestamp"
});

// --- Profile Schemas ---

export const profileVisibilitySchema = z.enum(['public', 'private']);
export const profileGenderSchema = z.enum(['male', 'female', 'other']);
export const userRoleSchema = z.enum(['user', 'admin', 'moderator']);
export const userStatusSchema = z.enum(['active', 'banned']);

export const profileGalleryItemSchema = z.object({
    id: z.string(),
    imageUrl: z.string().url().or(z.string().startsWith('data:image/')),
    caption: z.string().default(''),
    visibility: profileVisibilitySchema.default('public'),
    createdAt: z.number().default(() => Date.now()),
});

export const profileStoryItemSchema = z.object({
    id: z.string(),
    imageUrl: z.string().url().or(z.string().startsWith('data:image/')),
    visibility: profileVisibilitySchema.default('public'),
    createdAt: z.number().default(() => Date.now()),
    expiresAt: z.number(),
});

export const profileHighlightItemSchema = z.object({
    id: z.string(),
    title: z.string().default('Highlight'),
    coverImageUrl: z.string().url().or(z.string().startsWith('data:image/')),
    visibility: profileVisibilitySchema.default('public'),
    createdAt: z.number().default(() => Date.now()),
});

export const googleDriveConnectionSchema = z.object({
    email: z.string().email(),
    connectedAt: z.number(),
    folderId: z.string().optional(),
    folderLink: z.string().url().optional(),
    accessToken: z.string().optional(),
});

export const autoBackupIntervalSchema = z.enum(['24h', '2d', '7d', '28d']);

export const autoBackupSettingsSchema = z.object({
    enabled: z.boolean().default(false),
    interval: autoBackupIntervalSchema.default('24h'),
    lastBackupAt: z.number().optional(),
    lastBackupFile: z.string().optional(),
});

export const socialLinksSchema = z.object({
    instagram: z.string().url().optional().or(z.string().length(0)),
    linkedin: z.string().url().optional().or(z.string().length(0)),
    github: z.string().url().optional().or(z.string().length(0)),
}).default({
    instagram: '',
    linkedin: '',
    github: '',
});

export const notificationPreferencesSchema = z.object({
    directMessages: z.boolean().default(true),
    mentions: z.boolean().default(true),
    groupMessages: z.boolean().default(true),
    confessions: z.boolean().default(true),
    announcements: z.boolean().default(true),
}).default({
    directMessages: true,
    mentions: true,
    groupMessages: true,
    confessions: true,
    announcements: true,
});

export const userProfileSchema = z.object({
    userId: z.string(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    profileImage: z.string().default(''),
    bio: z.string().default(''),
    socialLinks: socialLinksSchema,
    field: z.string().min(1, "Field is required"),
    year: z.string().min(1, "Year is required"),
    division: z.string().min(1, "Division is required"),
    branch: z.string().optional(),
    gender: profileGenderSchema.default('other'),
    accountVisibility: profileVisibilitySchema.default('public'),
    gallery: z.array(profileGalleryItemSchema).default([]),
    stories: z.array(profileStoryItemSchema).default([]),
    highlights: z.array(profileHighlightItemSchema).default([]),
    googleDrive: googleDriveConnectionSchema.optional(),
    autoBackup: autoBackupSettingsSchema.optional(),
    encryptionSalt: z.string().optional(),
    encryptionEnabled: z.boolean().default(false),
    fcmToken: z.string().optional(),
    notificationPrefs: notificationPreferencesSchema,
    mutedEntities: z.array(z.string()).default([]),
    role: userRoleSchema.default('user'),
    status: userStatusSchema.default('active'),
    createdAt: z.number().default(() => Date.now()),
});

// --- Group Schemas ---

export const groupTypeSchema = z.enum(['field', 'year', 'division', 'custom']);

export const groupHierarchyInfoSchema = z.object({
    field: z.string().optional(),
    year: z.string().optional(),
    division: z.string().optional(),
});

export const groupSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Group name is required"),
    description: z.string().default(''),
    avatarUrl: z.string().optional(),
    type: groupTypeSchema,
    hierarchyInfo: groupHierarchyInfoSchema.optional(),
    memberIds: z.array(z.string()).default([]),
    adminIds: z.array(z.string()).default([]),
    createdAt: firebaseTimestampSchema.nullable(),
    updatedAt: firebaseTimestampSchema.nullable(),
    lastMessage: z.string().optional(),
    unreadCount: z.record(z.string(), z.number()).optional(),
});

// --- Message Schemas ---

export const messageSchema = z.object({
    id: z.string(),
    text: z.string(),
    senderId: z.string(),
    senderName: z.string().optional(),
    senderImage: z.string().optional(),
    gifUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    audioUrl: z.string().optional(),
    reactions: z.record(z.string(), z.array(z.string())).optional(),
    timestamp: firebaseTimestampSchema.nullable(),
    isEdited: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    replyToId: z.string().optional(),
});
