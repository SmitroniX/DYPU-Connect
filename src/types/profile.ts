export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'banned';
export type ProfileGender = 'male' | 'female' | 'other';
export type ProfileVisibility = 'public' | 'private';

export interface ProfileGalleryItem {
    id: string;
    imageUrl: string;
    caption: string;
    visibility: ProfileVisibility;
    createdAt: number;
}

export interface ProfileStoryItem {
    id: string;
    imageUrl: string;
    visibility: ProfileVisibility;
    createdAt: number;
    expiresAt: number;
}

export interface ProfileHighlightItem {
    id: string;
    title: string;
    coverImageUrl: string;
    visibility: ProfileVisibility;
    createdAt: number;
}

export interface GoogleDriveConnection {
    email: string;
    connectedAt: number;
    folderId?: string;
    folderLink?: string;
    accessToken?: string;
}

export type AutoBackupInterval = '24h' | '2d' | '7d' | '28d';

export interface AutoBackupSettings {
    /** Whether auto-backup is enabled */
    enabled: boolean;
    /** Backup frequency */
    interval: AutoBackupInterval;
    /** Timestamp (ms) of last successful auto-backup */
    lastBackupAt?: number;
    /** Filename of last backup */
    lastBackupFile?: string;
}

export const AUTO_BACKUP_INTERVALS: { value: AutoBackupInterval; label: string; ms: number }[] = [
    { value: '24h', label: 'Every 24 hours', ms: 24 * 60 * 60 * 1000 },
    { value: '2d',  label: 'Every 2 days',   ms: 2 * 24 * 60 * 60 * 1000 },
    { value: '7d',  label: 'Every week',      ms: 7 * 24 * 60 * 60 * 1000 },
    { value: '28d', label: 'Every 28 days',   ms: 28 * 24 * 60 * 60 * 1000 },
];

export interface NotificationPreferences {
    directMessages: boolean;
    mentions: boolean;
    groupMessages: boolean;
    confessions: boolean;
    announcements: boolean;
}

export interface SocialLinks {
    instagram?: string;
    linkedin?: string;
    github?: string;
}

export interface UserProfile {
    userId: string;
    name: string;
    email: string;
    profileImage: string;
    bio?: string;
    socialLinks?: SocialLinks;
    field: string;
    year: string;
    division: string;
    branch?: string;
    gender: ProfileGender;
    accountVisibility: ProfileVisibility;
    gallery: ProfileGalleryItem[];
    stories: ProfileStoryItem[];
    highlights: ProfileHighlightItem[];
    googleDrive?: GoogleDriveConnection;
    autoBackup?: AutoBackupSettings;
    encryptionSalt?: string;
    encryptionEnabled?: boolean;
    fcmToken?: string;
    notificationPrefs?: NotificationPreferences;
    mutedEntities?: string[];
    role: UserRole;
    status: UserStatus;
    createdAt: number;
}

export interface ProfileFormData {
    name: string;
    bio: string;
    socialLinks: SocialLinks;
    field: string;
    year: string;
    division: string;
    branch: string;
    gender: ProfileGender;
    accountVisibility: ProfileVisibility;
}

export const PROFILE_FIELDS = ['Engineering', 'MBBS', 'MBA', 'MBA Tech', 'Law', 'Pharmacy', 'Ayurvedic'] as const;
export const PROFILE_YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'] as const;
export const PROFILE_GENDERS: readonly ProfileGender[] = ['male', 'female', 'other'] as const;
export const PROFILE_VISIBILITY_OPTIONS: readonly ProfileVisibility[] = ['public', 'private'] as const;
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export const PROFILE_DIVISIONS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export const PROFILE_BRANCHES_BY_FIELD: Record<string, string[]> = {
    Engineering: [
        'Computer Engineering',
        'Information Technology',
        'Electronics and Telecommunication',
        'Mechanical Engineering',
        'Civil Engineering',
        'Electrical Engineering',
        'Artificial Intelligence and Data Science',
    ],
    MBBS: [
        'General Medicine',
        'Surgery',
        'Pediatrics',
        'Orthopedics',
        'Obstetrics and Gynecology',
        'Dermatology',
    ],
    MBA: [
        'Finance',
        'Marketing',
        'Human Resources',
        'Operations',
        'Business Analytics',
        'International Business',
    ],
    'MBA Tech': [
        'Technology Management',
        'Product Management',
        'Data Analytics',
        'Digital Transformation',
        'Information Systems',
        'Innovation and Entrepreneurship',
    ],
    Law: [
        'Constitutional Law',
        'Criminal Law',
        'Corporate Law',
        'Intellectual Property Law',
        'International Law',
        'Taxation Law',
    ],
    Pharmacy: [
        'Pharmaceutics',
        'Pharmaceutical Chemistry',
        'Pharmacology',
        'Pharmacognosy',
        'Clinical Pharmacy',
        'Quality Assurance',
    ],
    Ayurvedic: [
        'Kayachikitsa',
        'Shalya Tantra',
        'Shalakya Tantra',
        'Prasuti Tantra and Stri Roga',
        'Kaumarbhritya',
        'Panchakarma',
    ],
};

export function getProfileBranchOptions(field: string): string[] {
    return PROFILE_BRANCHES_BY_FIELD[field] ?? ['General'];
}

function isVisibility(value: unknown): value is ProfileVisibility {
    return value === 'public' || value === 'private';
}

function isGender(value: unknown): value is ProfileGender {
    return value === 'male' || value === 'female' || value === 'other';
}

function normalizeGallery(gallery: unknown): ProfileGalleryItem[] {
    if (!Array.isArray(gallery)) return [];

    return gallery
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;
            const raw = item as Partial<ProfileGalleryItem>;
            if (typeof raw.imageUrl !== 'string' || !raw.imageUrl.trim()) return null;

            const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
            return {
                id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `gallery_${createdAt}_${index}`,
                imageUrl: raw.imageUrl,
                caption: typeof raw.caption === 'string' ? raw.caption : '',
                visibility: isVisibility(raw.visibility) ? raw.visibility : 'public',
                createdAt,
            } satisfies ProfileGalleryItem;
        })
        .filter((item): item is ProfileGalleryItem => item !== null);
}

function normalizeStories(stories: unknown): ProfileStoryItem[] {
    if (!Array.isArray(stories)) return [];

    return stories
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;
            const raw = item as Partial<ProfileStoryItem>;
            if (typeof raw.imageUrl !== 'string' || !raw.imageUrl.trim()) return null;

            const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
            const expiresAt = typeof raw.expiresAt === 'number' ? raw.expiresAt : createdAt + STORY_TTL_MS;
            return {
                id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `story_${createdAt}_${index}`,
                imageUrl: raw.imageUrl,
                visibility: isVisibility(raw.visibility) ? raw.visibility : 'public',
                createdAt,
                expiresAt,
            } satisfies ProfileStoryItem;
        })
        .filter((item): item is ProfileStoryItem => item !== null);
}

function normalizeHighlights(highlights: unknown): ProfileHighlightItem[] {
    if (!Array.isArray(highlights)) return [];

    return highlights
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;
            const raw = item as Partial<ProfileHighlightItem>;
            if (typeof raw.coverImageUrl !== 'string' || !raw.coverImageUrl.trim()) return null;

            const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
            return {
                id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `highlight_${createdAt}_${index}`,
                title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Highlight',
                coverImageUrl: raw.coverImageUrl,
                visibility: isVisibility(raw.visibility) ? raw.visibility : 'public',
                createdAt,
            } satisfies ProfileHighlightItem;
        })
        .filter((item): item is ProfileHighlightItem => item !== null);
}

function normalizeGoogleDriveConnection(value: unknown): GoogleDriveConnection | undefined {
    if (!value || typeof value !== 'object') return undefined;

    const raw = value as Partial<GoogleDriveConnection>;
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    if (!email) return undefined;

    const folderId = typeof raw.folderId === 'string' && raw.folderId.trim() ? raw.folderId.trim() : undefined;
    const folderLink = typeof raw.folderLink === 'string' && raw.folderLink.trim() ? raw.folderLink.trim() : undefined;

    return {
        email,
        connectedAt: typeof raw.connectedAt === 'number' ? raw.connectedAt : Date.now(),
        folderId,
        folderLink,
    };
}

export function normalizeUserProfile(profile: UserProfile): UserProfile {
    const raw = profile as Partial<UserProfile>;
    return {
        ...profile,
        bio: typeof raw.bio === 'string' ? raw.bio : '',
        socialLinks: raw.socialLinks && typeof raw.socialLinks === 'object' ? {
            instagram: typeof raw.socialLinks.instagram === 'string' ? raw.socialLinks.instagram : undefined,
            linkedin: typeof raw.socialLinks.linkedin === 'string' ? raw.socialLinks.linkedin : undefined,
            github: typeof raw.socialLinks.github === 'string' ? raw.socialLinks.github : undefined,
        } : {},
        gender: isGender(raw.gender) ? raw.gender : 'other',
        accountVisibility: isVisibility(raw.accountVisibility) ? raw.accountVisibility : 'public',
        gallery: normalizeGallery(raw.gallery),
        stories: normalizeStories(raw.stories),
        highlights: normalizeHighlights(raw.highlights),
        googleDrive: normalizeGoogleDriveConnection(raw.googleDrive),
        encryptionSalt: typeof raw.encryptionSalt === 'string' ? raw.encryptionSalt : undefined,
        encryptionEnabled: typeof raw.encryptionEnabled === 'boolean' ? raw.encryptionEnabled : false,
        fcmToken: typeof raw.fcmToken === 'string' ? raw.fcmToken : undefined,
        notificationPrefs: raw.notificationPrefs && typeof raw.notificationPrefs === 'object' ? {
            directMessages: typeof raw.notificationPrefs.directMessages === 'boolean' ? raw.notificationPrefs.directMessages : true,
            mentions: typeof raw.notificationPrefs.mentions === 'boolean' ? raw.notificationPrefs.mentions : true,
            groupMessages: typeof raw.notificationPrefs.groupMessages === 'boolean' ? raw.notificationPrefs.groupMessages : true,
            confessions: typeof raw.notificationPrefs.confessions === 'boolean' ? raw.notificationPrefs.confessions : true,
            announcements: typeof raw.notificationPrefs.announcements === 'boolean' ? raw.notificationPrefs.announcements : true,
        } : {
            directMessages: true,
            mentions: true,
            groupMessages: true,
            confessions: true,
            announcements: true,
        },
        mutedEntities: Array.isArray(raw.mutedEntities) ? raw.mutedEntities.filter(e => typeof e === 'string') : [],
        role: raw.role || 'user',
        status: raw.status || 'active',
    };
}
