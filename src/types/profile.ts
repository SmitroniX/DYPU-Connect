import { 
    UserProfile, 
    ProfileGalleryItem, 
    ProfileStoryItem, 
    ProfileHighlightItem, 
    GoogleDriveConnection, 
    AutoBackupSettings, 
    NotificationPreferences, 
    SocialLinks,
    UserRole,
    UserStatus,
    ProfileGender,
    ProfileVisibility,
    AutoBackupInterval,
    userProfileSchema
} from '@/lib/validation/schemas';

export type {
    UserProfile,
    ProfileGalleryItem,
    ProfileStoryItem,
    ProfileHighlightItem,
    GoogleDriveConnection,
    AutoBackupSettings,
    NotificationPreferences,
    SocialLinks,
    UserRole,
    UserStatus,
    ProfileGender,
    ProfileVisibility,
    AutoBackupInterval
};

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

export const AUTO_BACKUP_INTERVALS: { value: AutoBackupInterval; label: string; ms: number }[] = [
    { value: '24h', label: 'Every 24 hours', ms: 24 * 60 * 60 * 1000 },
    { value: '2d',  label: 'Every 2 days',   ms: 2 * 24 * 60 * 60 * 1000 },
    { value: '7d',  label: 'Every week',      ms: 7 * 24 * 60 * 60 * 1000 },
    { value: '28d', label: 'Every 28 days',   ms: 28 * 24 * 60 * 60 * 1000 },
];

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

/**
 * Normalizes a user profile object using Zod.
 * If validation fails, it returns the original object with an error logged.
 */
export function normalizeUserProfile(profile: UserProfile): UserProfile {
    const result = userProfileSchema.safeParse(profile);
    if (result.success) {
        return result.data;
    }
    console.error("[normalizeUserProfile] Validation failed:", result.error.format());
    return profile;
}
