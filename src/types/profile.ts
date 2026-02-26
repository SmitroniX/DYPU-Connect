export type UserRole = 'user' | 'admin';
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
}

export interface UserProfile {
    userId: string;
    name: string;
    email: string;
    profileImage: string;
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
    role: UserRole;
    status: UserStatus;
    createdAt: number;
}

export interface ProfileFormData {
    name: string;
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
        gender: isGender(raw.gender) ? raw.gender : 'other',
        accountVisibility: isVisibility(raw.accountVisibility) ? raw.accountVisibility : 'public',
        gallery: normalizeGallery(raw.gallery),
        stories: normalizeStories(raw.stories),
        highlights: normalizeHighlights(raw.highlights),
        googleDrive: normalizeGoogleDriveConnection(raw.googleDrive),
    };
}
