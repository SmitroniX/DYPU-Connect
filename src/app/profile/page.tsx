'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import type { FirebaseError } from 'firebase/app';
import { formatDistanceToNowStrict } from 'date-fns';
import {
    isGoogleDriveConfigured,
    requestGoogleDriveAccessToken,
    uploadImageToGoogleDrive,
} from '@/lib/googleDrive';
import { logActivity, fetchActivityLog, type ActivityLogEntry } from '@/lib/activityLog';
import { exportProfileBackup, listBackups, importProfileBackup } from '@/lib/backup';
import type { GoogleDriveListFile } from '@/lib/googleDrive';
import type {
    ProfileFormData,
    ProfileGalleryItem,
    ProfileHighlightItem,
    ProfileStoryItem,
    ProfileVisibility,
    UserProfile,
} from '@/types/profile';
import {
    getProfileBranchOptions,
    PROFILE_DIVISIONS,
    PROFILE_FIELDS,
    PROFILE_GENDERS,
    PROFILE_VISIBILITY_OPTIONS,
    PROFILE_YEARS,
    STORY_TTL_MS,
} from '@/types/profile';
import { resolveProfileImage } from '@/lib/profileImage';
import {
    Award,
    Camera,
    ChevronUp,
    Clock,
    Download,
    Edit3,
    ExternalLink,
    Eye,
    EyeOff,
    GalleryHorizontalEnd,
    Github,
    Globe,
    Grid3X3,
    HardDriveUpload,
    ImagePlus,
    Instagram,
    Linkedin,
    Lock,
    Mail,
    Plus,
    Save,
    ScrollText,
    Shield,
    ShieldCheck,
    Sparkles,
    Star,
    Trash2,
    Upload,
    User,
    X,
    Zap,
} from 'lucide-react';

interface EditableProfileData extends ProfileFormData {
    profileImage: string;
}

/* ── Profile completion calculator ── */
function computeProfileCompletion(profile: UserProfile): number {
    let score = 0;
    const total = 10;
    if (profile.name?.trim()) score++;
    if (profile.bio?.trim()) score++;
    if (profile.profileImage && !profile.profileImage.includes('dicebear') && !profile.profileImage.includes('ui-avatars')) score++;
    if (profile.field) score++;
    if (profile.year) score++;
    if (profile.branch) score++;
    if (profile.socialLinks?.instagram || profile.socialLinks?.linkedin || profile.socialLinks?.github) score++;
    if (profile.gallery.length > 0) score++;
    if (profile.googleDrive) score++;
    if (profile.highlights.length > 0) score++;
    return Math.round((score / total) * 100);
}

interface GalleryDraft {
    imageSource: string;
    caption: string;
    visibility: ProfileVisibility;
}

interface StoryDraft {
    imageSource: string;
    visibility: ProfileVisibility;
}

interface HighlightDraft {
    title: string;
    coverSource: string;
    visibility: ProfileVisibility;
}

function createClientId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function visibilityLabel(visibility: ProfileVisibility): string {
    return visibility === 'public' ? 'Public' : 'Private';
}

/* ── Tiny reusable UI pieces ─────────────────────── */

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' | 'success' | 'warning' }) {
    const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase';
    const styles: Record<string, string> = {
        default: 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)]',
        accent: 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/30',
        success: 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/30',
        warning: 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] ring-1 ring-[var(--ui-border)]',
    };
    return <span className={`${base} ${styles[variant]}`}>{children}</span>;
}

function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: React.ElementType; title: string; subtitle: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20">
                    <Icon className="h-5 w-5 text-[var(--ui-accent)]" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--ui-text)]">{title}</h2>
                    <p className="text-xs text-[var(--ui-text-muted)] mt-0.5">{subtitle}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`surface p-5 sm:p-6 transition-all duration-300 ${className}`}>
            {children}
        </div>
    );
}

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">{label}</label>
            <input
                id={id}
                className="input"
                {...props}
            />
        </div>
    );
}

function SelectField({ label, id, children, ...props }: { label: string; id: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">{label}</label>
            <select
                id={id}
                className="w-full rounded-lg bg-[var(--ui-bg-input)] border-none px-3.5 py-2.5 text-sm text-[var(--ui-text)] focus:outline-none transition-all appearance-none"
                {...props}
            >
                {children}
            </select>
        </div>
    );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] px-5 py-2.5 text-sm font-semibold text-[var(--ui-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            {...props}
        >
            {children}
        </button>
    );
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            {...props}
        >
            {children}
        </button>
    );
}

/* ── Tab selector ───────────────────────────────── */

type ProfileTab = 'edit' | 'stories' | 'highlights' | 'gallery' | 'activity';

function TabBar({ activeTab, setActiveTab, storiesCount, highlightsCount, galleryCount }: {
    activeTab: ProfileTab;
    setActiveTab: (tab: ProfileTab) => void;
    storiesCount: number;
    highlightsCount: number;
    galleryCount: number;
}) {
    const tabs: { key: ProfileTab; label: string; icon: React.ElementType; count?: number }[] = [
        { key: 'edit', label: 'Edit Profile', icon: Edit3 },
        { key: 'stories', label: 'Stories', icon: Clock, count: storiesCount },
        { key: 'highlights', label: 'Highlights', icon: Star, count: highlightsCount },
        { key: 'gallery', label: 'Gallery', icon: Grid3X3, count: galleryCount },
        { key: 'activity', label: 'Activity', icon: ScrollText },
    ];

    return (
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] overflow-x-auto">
            {tabs.map(({ key, label, icon: TabIcon, count }) => (
                <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                        activeTab === key
                            ? 'bg-[var(--ui-accent)] text-[var(--ui-bg-elevated)]'
                            : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)]'
                    }`}
                >
                    <TabIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                    {count !== undefined && count > 0 && (
                        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            activeTab === key ? 'bg-[var(--ui-bg-elevated)]/20' : 'bg-[var(--ui-bg-elevated)]'
                        }`}>
                            {count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

/* ── Main Page ──────────────────────────────────── */

export default function ProfilePage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const router = useRouter();
    const profilePhotoFileInputRef = useRef<HTMLInputElement>(null);
    const storyFileInputRef = useRef<HTMLInputElement>(null);
    const highlightFileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<ProfileTab>('edit');
    const [formData, setFormData] = useState<EditableProfileData>({
        name: '',
        bio: '',
        socialLinks: {},
        field: 'Engineering',
        year: 'First Year',
        division: 'A',
        branch: '',
        gender: 'other',
        accountVisibility: 'public',
        profileImage: '',
    });
    const [saving, setSaving] = useState(false);
    const [uploadingTarget, setUploadingTarget] = useState<'profile' | 'story' | 'highlight' | 'gallery' | null>(null);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [galleryDraft, setGalleryDraft] = useState<GalleryDraft>({ imageSource: '', caption: '', visibility: 'public' });
    const [storyDraft, setStoryDraft] = useState<StoryDraft>({ imageSource: '', visibility: 'public' });
    const [highlightDraft, setHighlightDraft] = useState<HighlightDraft>({ title: '', coverSource: '', visibility: 'public' });
    const [showAddStory, setShowAddStory] = useState(false);
    const [showAddHighlight, setShowAddHighlight] = useState(false);
    const [showAddGallery, setShowAddGallery] = useState(false);
    const [galleryPreview, setGalleryPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Activity log state
    const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Backup state
    const [backupBusy, setBackupBusy] = useState(false);
    const [backupFiles, setBackupFiles] = useState<GoogleDriveListFile[]>([]);
    const [showBackups, setShowBackups] = useState(false);

    // Only populate form from profile on first load (not on every profile change)
    const formInitialized = useRef(false);
    const prevFieldRef = useRef(formData.field);
    const storiesCleanedRef = useRef(false);

    useEffect(() => {
        if (!user) { router.replace('/login'); return; }
        if (!userProfile) { router.replace('/setup-profile'); return; }
        if (formInitialized.current) return;
        formInitialized.current = true;
        setFormData({
            name: userProfile.name,
            bio: userProfile.bio ?? '',
            socialLinks: userProfile.socialLinks ?? {},
            field: userProfile.field,
            year: userProfile.year,
            division: userProfile.division,
            branch: userProfile.branch ?? '',
            gender: userProfile.gender,
            accountVisibility: userProfile.accountVisibility,
            profileImage: userProfile.profileImage,
        });
    }, [router, user, userProfile]);

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
        return () => window.clearInterval(timer);
    }, []);

    const branchOptions = getProfileBranchOptions(formData.field);

    useEffect(() => {
        if (formData.field !== prevFieldRef.current) {
            prevFieldRef.current = formData.field;
            if (!branchOptions.includes(formData.branch)) {
                setFormData((prev) => ({ ...prev, branch: branchOptions[0] }));
            }
        }
    }, [branchOptions, formData.branch, formData.field]);

    // Clean up expired stories
    useEffect(() => {
        if (!user || !userProfile || storiesCleanedRef.current) return;
        const activeStories = userProfile.stories.filter((s) => s.expiresAt > Date.now());
        if (activeStories.length === userProfile.stories.length) return;
        storiesCleanedRef.current = true;
        const syncStories = async () => {
            try {
                await updateDoc(doc(db, 'users', user.uid), { stories: activeStories });
                setUserProfile({ ...userProfile, stories: activeStories });
            } catch { /* silent */ }
        };
        void syncStories();
    }, [user, userProfile, setUserProfile]);

    // Load activity logs when tab is selected
    useEffect(() => {
        if (activeTab !== 'activity' || !user) return;
        setLoadingLogs(true);
        fetchActivityLog(user.uid, 50)
            .then(setActivityLogs)
            .catch(() => toast.error('Failed to load activity log.'))
            .finally(() => setLoadingLogs(false));
    }, [activeTab, user]);

    const applyProfileUpdates = async (updates: Partial<UserProfile>, successMessage?: string) => {
        if (!user) return false;
        const freshProfile = useStore.getState().userProfile;
        if (!freshProfile) return false;
        await updateDoc(doc(db, 'users', user.uid), updates);
        setUserProfile({ ...freshProfile, ...updates });
        if (successMessage) toast.success(successMessage);
        return true;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile) return;
        const cleanName = formData.name.trim();
        if (!cleanName) { toast.error('Please enter your full name.'); return; }
        setSaving(true);
        try {
            // Build socialLinks without undefined values (Firestore rejects undefined)
            const socialLinks: Record<string, string> = {};
            if (formData.socialLinks.instagram?.trim()) socialLinks.instagram = formData.socialLinks.instagram.trim();
            if (formData.socialLinks.linkedin?.trim()) socialLinks.linkedin = formData.socialLinks.linkedin.trim();
            if (formData.socialLinks.github?.trim()) socialLinks.github = formData.socialLinks.github.trim();

            const profileUpdates = {
                name: cleanName,
                bio: formData.bio.trim(),
                socialLinks,
                field: formData.field,
                year: formData.year,
                division: formData.division,
                branch: formData.branch.trim(),
                gender: formData.gender,
                accountVisibility: formData.accountVisibility,
                profileImage: resolveProfileImage(formData.profileImage.trim(), userProfile.email, cleanName),
            };
            await applyProfileUpdates(profileUpdates, 'Profile updated successfully.');
            logActivity(user.uid, 'profile_update', `Updated profile: ${cleanName}`);
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') toast.error('Permission denied by Firestore Rules for profile update.');
            else if (error instanceof Error) toast.error(error.message || 'Failed to update profile.');
            else toast.error('Failed to update profile.');
        } finally { setSaving(false); }
    };

    const addGalleryItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        if (!userProfile || !galleryDraft.imageSource) { toast.error('Upload an image first using the button below.'); return; }
        const item: ProfileGalleryItem = { id: createClientId('gallery'), imageUrl: galleryDraft.imageSource, caption: galleryDraft.caption.trim(), visibility: galleryDraft.visibility, createdAt: Date.now() };
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ gallery: [item, ...(freshProfile?.gallery ?? [])] }, 'Gallery updated.');
            logActivity(user!.uid, 'gallery_add', `Added gallery photo`);
            setGalleryDraft({ imageSource: '', caption: '', visibility: 'public' });
            setShowAddGallery(false);
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') toast.error('You do not have permission to update gallery.');
            else toast.error('Failed to add gallery photo.');
        } finally { setBusy(false); }
    };

    const removeGalleryItem = async (itemId: string) => {
        if (!userProfile || busy) return;
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ gallery: (freshProfile?.gallery ?? []).filter((i) => i.id !== itemId) }, 'Photo removed.');
            logActivity(user!.uid, 'gallery_remove', 'Removed gallery photo');
            if (galleryPreview === itemId) setGalleryPreview(null);
        } catch { toast.error('Failed to remove gallery photo.'); }
        finally { setBusy(false); }
    };

    const addStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        if (!userProfile || !storyDraft.imageSource) { toast.error('Upload an image first using the button below.'); return; }
        const createdAt = Date.now();
        const story: ProfileStoryItem = { id: createClientId('story'), imageUrl: storyDraft.imageSource, visibility: storyDraft.visibility, createdAt, expiresAt: createdAt + STORY_TTL_MS };
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ stories: [story, ...(freshProfile?.stories ?? [])] }, 'Story uploaded.');
            logActivity(user!.uid, 'story_add', 'Uploaded a new story');
            setStoryDraft({ imageSource: '', visibility: 'public' });
            setShowAddStory(false);
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') toast.error('You do not have permission to upload stories.');
            else toast.error('Failed to upload story.');
        } finally { setBusy(false); }
    };

    const removeStory = async (storyId: string) => {
        if (!userProfile || busy) return;
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ stories: (freshProfile?.stories ?? []).filter((s) => s.id !== storyId) }, 'Story removed.');
            logActivity(user!.uid, 'story_remove', 'Removed a story');
        } catch { toast.error('Failed to remove story.'); }
        finally { setBusy(false); }
    };

    const addHighlight = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || busy) return;
        const cleanTitle = highlightDraft.title.trim();
        if (!cleanTitle || !highlightDraft.coverSource) { toast.error('Add a title and upload a cover image.'); return; }
        const highlight: ProfileHighlightItem = { id: createClientId('highlight'), title: cleanTitle, coverImageUrl: highlightDraft.coverSource, visibility: highlightDraft.visibility, createdAt: Date.now() };
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ highlights: [highlight, ...(freshProfile?.highlights ?? [])] }, 'Highlight added.');
            logActivity(user!.uid, 'highlight_add', `Added highlight: ${cleanTitle}`);
            setHighlightDraft({ title: '', coverSource: '', visibility: 'public' });
            setShowAddHighlight(false);
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') toast.error('You do not have permission to add highlights.');
            else toast.error('Failed to add highlight.');
        } finally { setBusy(false); }
    };

    const removeHighlight = async (highlightId: string) => {
        if (!userProfile || busy) return;
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ highlights: (freshProfile?.highlights ?? []).filter((h) => h.id !== highlightId) }, 'Highlight removed.');
            logActivity(user!.uid, 'highlight_remove', 'Removed a highlight');
        } catch { toast.error('Failed to remove highlight.'); }
        finally { setBusy(false); }
    };

    const activeStories = useMemo(
        () => (userProfile?.stories ?? []).filter((s) => s.expiresAt > currentTime),
        [userProfile?.stories, currentTime]
    );

    const driveConfigured = isGoogleDriveConfigured();
    const driveConnected = !!userProfile?.googleDrive;
    // Allow clicking upload buttons always — the upload function shows
    // a clear error message if Drive isn't configured.
    const canUploadToDrive = true;

    const { driveAccessToken, setDriveAccessToken } = useStore();

    const uploadImageFileToDrive = async (file: File, target: 'profile' | 'story' | 'highlight' | 'gallery'): Promise<string | null> => {
        if (!driveConfigured) {
            toast.error('Google Drive upload is not available. The site admin needs to add NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
            return null;
        }
        if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return null; }

        // Auto-fix: if profile is missing googleDrive field, set it now
        if (!userProfile?.googleDrive && user?.email) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    googleDrive: { email: user.email, connectedAt: Date.now() },
                });
                setUserProfile({ ...userProfile!, googleDrive: { email: user.email, connectedAt: Date.now() } });
            } catch { /* non-critical */ }
        }

        setUploadingTarget(target);
        try {
            let accessToken: string;
            if (driveAccessToken) {
                accessToken = driveAccessToken;
            } else {
                try { accessToken = await requestGoogleDriveAccessToken(''); }
                catch { accessToken = await requestGoogleDriveAccessToken('consent'); }
                // Cache the token for subsequent uploads (avoids repeated popups)
                setDriveAccessToken(accessToken);
            }
            const uploadResult = await uploadImageToGoogleDrive({ accessToken, file, folderId: userProfile?.googleDrive?.folderId });
            toast.success('Image uploaded to Google Drive.');
            logActivity(user!.uid, 'drive_upload', `Uploaded ${file.name} for ${target}`);
            return uploadResult.directImageUrl;
        } catch (error) {
            // If token expired, clear it so next attempt gets a fresh one
            setDriveAccessToken(null);
            toast.error(error instanceof Error ? error.message : 'Google Drive upload failed.');
            return null;
        } finally { setUploadingTarget(null); }
    };

    const handleProfilePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        const uploadedUrl = await uploadImageFileToDrive(file, 'profile');
        if (uploadedUrl) setFormData((prev) => ({ ...prev, profileImage: uploadedUrl }));
    };
    const handleStoryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        const uploadedUrl = await uploadImageFileToDrive(file, 'story');
        if (uploadedUrl) setStoryDraft((prev) => ({ ...prev, imageSource: uploadedUrl }));
    };
    const handleHighlightFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        const uploadedUrl = await uploadImageFileToDrive(file, 'highlight');
        if (uploadedUrl) setHighlightDraft((prev) => ({ ...prev, coverSource: uploadedUrl }));
    };
    const handleGalleryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        const uploadedUrl = await uploadImageFileToDrive(file, 'gallery');
        if (uploadedUrl) setGalleryDraft((prev) => ({ ...prev, imageSource: uploadedUrl }));
    };

    /* ── Backup handlers ─────────────────────────── */
    const handleExportBackup = async () => {
        if (!userProfile || backupBusy) return;
        setBackupBusy(true);
        try {
            const fileName = await exportProfileBackup(userProfile, driveAccessToken);
            toast.success(`Backup saved: ${fileName}`);
            logActivity(user!.uid, 'backup_export', `Exported backup: ${fileName}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Backup export failed.');
        } finally { setBackupBusy(false); }
    };

    const handleListBackups = async () => {
        if (backupBusy) return;
        setBackupBusy(true);
        setShowBackups(true);
        try {
            const files = await listBackups(driveAccessToken, userProfile?.googleDrive?.folderId);
            setBackupFiles(files);
            if (files.length === 0) toast('No backups found on your Drive.', { icon: 'ℹ️' });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to list backups.');
        } finally { setBackupBusy(false); }
    };

    const handleImportBackup = async (fileId: string, fileName: string) => {
        if (!user || !userProfile || backupBusy) return;
        if (!confirm(`Restore from "${fileName}"? This will overwrite your current profile data.`)) return;
        setBackupBusy(true);
        try {
            const restoredProfile = await importProfileBackup(driveAccessToken, fileId);
            // Preserve current userId, email, role, status, and googleDrive connection
            const merged: Partial<UserProfile> = {
                name: restoredProfile.name,
                profileImage: restoredProfile.profileImage,
                field: restoredProfile.field,
                year: restoredProfile.year,
                division: restoredProfile.division,
                branch: restoredProfile.branch,
                gender: restoredProfile.gender,
                accountVisibility: restoredProfile.accountVisibility,
                gallery: restoredProfile.gallery ?? [],
                stories: restoredProfile.stories ?? [],
                highlights: restoredProfile.highlights ?? [],
            };
            await updateDoc(doc(db, 'users', user.uid), merged);
            setUserProfile({ ...userProfile, ...merged });
            logActivity(user.uid, 'backup_import', `Restored from: ${fileName}`);
            toast.success('Profile restored from backup!');
            setShowBackups(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Backup import failed.');
        } finally { setBackupBusy(false); }
    };

    /* ── Loading state ───────────────────────────── */
    if (!user || !userProfile) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        </div>
                        <p className="text-sm text-[var(--ui-text-muted)] animate-pulse">Loading profile...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const createdOn = new Date(userProfile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const resolvedPreviewImage = resolveProfileImage(formData.profileImage, userProfile.email, formData.name || userProfile.name);
    const fallbackSrc = resolveProfileImage('', userProfile.email, userProfile.name);
    const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = fallbackSrc;
    };
    const profileCompletion = computeProfileCompletion(userProfile);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-6 px-2 sm:px-4 space-y-6">

                {/* ═══════════ HERO PROFILE HEADER ═══════════ */}
                <div className="relative overflow-hidden rounded-2xl">
                    {/* Gradient Banner */}
                    <div className="h-36 sm:h-44 bg-linear-to-br from-[var(--ui-accent)]/40 via-[var(--ui-bg-surface)] to-[var(--ui-bg-elevated)] relative">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMyAxLjM0MyAzIDNzLTEuMzQzIDMtMyAzLTMtMS4zNDMtMy0zIDEuMzQzLTMgMy0zek0yNCAzNmMxLjY1NyAwIDMgMS4zNDMgMyAzcy0xLjM0MyAzLTMgMy0zLTEuMzQzLTMtMyAxLjM0My0zIDMtM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-[var(--ui-bg-base)] to-transparent" />
                        {/* Encryption badge on banner */}
                        {userProfile.encryptionEnabled && (
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-[var(--ui-accent-dim)] px-2.5 py-1 text-[10px] font-bold text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/30">
                                <ShieldCheck className="h-3 w-3" /> Encrypted
                            </div>
                        )}
                    </div>

                    {/* Profile Info Overlay */}
                    <div className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                            {/* Avatar with completion ring */}
                            <div className="relative group">
                                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl ring-4 ring-[var(--ui-bg-base)] overflow-hidden bg-[var(--ui-bg-elevated)] shadow-2xl">
                                    <img
                                        src={resolvedPreviewImage}
                                        alt={formData.name || 'Profile'}
                                        onError={handleImgError}
                                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                {/* Completion indicator */}
                                <div className="absolute -top-1 -left-1 h-7 w-7 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] flex items-center justify-center shadow-lg">
                                    <span className={`text-[9px] font-bold ${profileCompletion >= 80 ? 'text-[var(--ui-success)]' : profileCompletion >= 50 ? 'text-[var(--ui-warning)]' : 'text-[var(--ui-text-muted)]'}`}>
                                        {profileCompletion}%
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setActiveTab('edit'); profilePhotoFileInputRef.current?.click(); }}
                                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-[var(--ui-accent)] flex items-center justify-center shadow-lg hover:bg-[var(--ui-accent-hover)] transition-colors"
                                    title="Upload profile photo"
                                >
                                    <Camera className="h-4 w-4 text-[var(--ui-bg-elevated)]" />
                                </button>
                            </div>

                            {/* Name & Details */}
                            <div className="flex-1 text-center sm:text-left space-y-2 pb-1">
                                <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ui-text)] tracking-tight">
                                        {userProfile.name}
                                    </h1>
                                    <Badge variant={userProfile.accountVisibility === 'public' ? 'success' : 'warning'}>
                                        {userProfile.accountVisibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                        {visibilityLabel(userProfile.accountVisibility)}
                                    </Badge>
                                    {userProfile.role === 'admin' && (
                                        <Badge variant="accent">
                                            <Sparkles className="h-3 w-3" /> Admin
                                        </Badge>
                                    )}
                                </div>

                                {/* Bio */}
                                {userProfile.bio && (
                                    <p className="text-sm text-[var(--ui-text-secondary)] max-w-lg italic">
                                        &ldquo;{userProfile.bio}&rdquo;
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-[var(--ui-text-muted)]">
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" /> {userProfile.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <User className="h-3.5 w-3.5" /> {userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1)}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <Badge>{userProfile.field}</Badge>
                                    {userProfile.branch && <Badge>{userProfile.branch}</Badge>}
                                    <Badge>{userProfile.year}</Badge>
                                    <Badge>Div {userProfile.division}</Badge>
                                </div>

                                {/* Social Links */}
                                {(userProfile.socialLinks?.instagram || userProfile.socialLinks?.linkedin || userProfile.socialLinks?.github) && (
                                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                                        {userProfile.socialLinks.instagram && (
                                            <a href={`https://instagram.com/${userProfile.socialLinks.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-1 rounded-lg bg-[var(--ui-bg-elevated)] px-2.5 py-1.5 text-[11px] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors">
                                                <Instagram className="h-3.5 w-3.5" /> {userProfile.socialLinks.instagram}
                                            </a>
                                        )}
                                        {userProfile.socialLinks.linkedin && (
                                            <a href={userProfile.socialLinks.linkedin.startsWith('http') ? userProfile.socialLinks.linkedin : `https://linkedin.com/in/${userProfile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-1 rounded-lg bg-[var(--ui-bg-elevated)] px-2.5 py-1.5 text-[11px] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors">
                                                <Linkedin className="h-3.5 w-3.5" /> LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                                            </a>
                                        )}
                                        {userProfile.socialLinks.github && (
                                            <a href={userProfile.socialLinks.github.startsWith('http') ? userProfile.socialLinks.github : `https://github.com/${userProfile.socialLinks.github}`} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-1 rounded-lg bg-[var(--ui-bg-elevated)] px-2.5 py-1.5 text-[11px] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors">
                                                <Github className="h-3.5 w-3.5" /> {userProfile.socialLinks.github}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex gap-6 sm:gap-8 text-center">
                                <div>
                                    <p className="text-xl font-bold text-[var(--ui-text)]">{activeStories.length}</p>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] uppercase tracking-wide">Stories</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-[var(--ui-text)]">{userProfile.highlights.length}</p>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] uppercase tracking-wide">Highlights</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-[var(--ui-text)]">{userProfile.gallery.length}</p>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] uppercase tracking-wide">Gallery</p>
                                </div>
                            </div>
                        </div>

                        {/* Achievement Badges */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                            {profileCompletion >= 80 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-success)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--ui-success)] ring-1 ring-[var(--ui-success)]/20">
                                    <Award className="h-3 w-3" /> Profile Pro
                                </span>
                            )}
                            {userProfile.googleDrive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-dim)] px-2.5 py-1 text-[10px] font-bold text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20">
                                    <HardDriveUpload className="h-3 w-3" /> Drive Connected
                                </span>
                            )}
                            {userProfile.encryptionEnabled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-dim)] px-2.5 py-1 text-[10px] font-bold text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20">
                                    <Shield className="h-3 w-3" /> Encrypted
                                </span>
                            )}
                            {userProfile.gallery.length >= 5 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-warning)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--ui-warning)] ring-1 ring-[var(--ui-warning)]/20">
                                    <Zap className="h-3 w-3" /> Shutterbug
                                </span>
                            )}
                            {(new Date().getTime() - userProfile.createdAt) > 30 * 24 * 60 * 60 * 1000 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-info)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--ui-info)] ring-1 ring-[var(--ui-info)]/20">
                                    <Sparkles className="h-3 w-3" /> Veteran
                                </span>
                            )}
                        </div>

                        {/* Profile Completion Bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-[var(--ui-text-muted)] uppercase tracking-wide">Profile Completion</span>
                                <span className={`text-[10px] font-bold ${profileCompletion >= 80 ? 'text-[var(--ui-success)]' : profileCompletion >= 50 ? 'text-[var(--ui-warning)]' : 'text-[var(--ui-text-muted)]'}`}>
                                    {profileCompletion}%
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--ui-bg-elevated)] overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${profileCompletion >= 80 ? 'bg-[var(--ui-success)]' : profileCompletion >= 50 ? 'bg-[var(--ui-warning)]' : 'bg-[var(--ui-accent)]'}`}
                                    style={{ width: `${profileCompletion}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-xs text-[var(--ui-text-muted)] mt-3 text-center sm:text-left">
                            Member since {createdOn}
                        </p>
                    </div>
                </div>

                {/* ═══════════ TAB BAR ═══════════ */}
                <TabBar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    storiesCount={activeStories.length}
                    highlightsCount={userProfile.highlights.length}
                    galleryCount={userProfile.gallery.length}
                />

                {/* ═══════════ EDIT PROFILE TAB ═══════════ */}
                {activeTab === 'edit' && (
                    <GlassCard>
                        <SectionHeader
                            icon={Edit3}
                            title="Edit Profile"
                            subtitle="Update your personal information and preferences"
                        />

                        <form className="mt-6 space-y-5" onSubmit={handleSave}>
                            {/* Profile Photo Section — Drive upload only */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]">
                                <img
                                    src={resolvedPreviewImage}
                                    alt="Preview"
                                    onError={handleImgError}
                                    className="h-16 w-16 rounded-xl object-cover object-center ring-2 ring-[var(--ui-border)]"
                                />
                                <div className="flex-1 min-w-0 space-y-2">
                                    <p className="text-xs font-medium text-[var(--ui-text-muted)]">Profile Photo</p>
                                    <PrimaryButton
                                        type="button"
                                        disabled={!canUploadToDrive || !!uploadingTarget}
                                        onClick={() => profilePhotoFileInputRef.current?.click()}
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        {uploadingTarget === 'profile' ? 'Uploading...' : 'Upload Photo'}
                                    </PrimaryButton>
                                </div>
                                <input ref={profilePhotoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoFileChange} />
                            </div>

                            {/* Name */}
                            <InputField
                                label="Full Name"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />

                            {/* Bio */}
                            <div>
                                <label htmlFor="bio" className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1.5">Bio / About Me</label>
                                <textarea
                                    id="bio"
                                    rows={3}
                                    maxLength={250}
                                    className="input resize-none"
                                    placeholder="Tell the campus about yourself..."
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                />
                                <p className="text-[10px] text-[var(--ui-text-muted)] mt-1 text-right">{formData.bio.length}/250</p>
                            </div>

                            {/* Social Links */}
                            <div>
                                <p className="text-xs font-medium text-[var(--ui-text-muted)] mb-3">Social Links</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="flex items-center gap-2">
                                        <Instagram className="h-4 w-4 text-[var(--ui-text-muted)] shrink-0" />
                                        <input
                                            className="input"
                                            placeholder="@username"
                                            value={formData.socialLinks.instagram ?? ''}
                                            onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: e.target.value } })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Linkedin className="h-4 w-4 text-[var(--ui-text-muted)] shrink-0" />
                                        <input
                                            className="input"
                                            placeholder="linkedin.com/in/..."
                                            value={formData.socialLinks.linkedin ?? ''}
                                            onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: e.target.value } })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Github className="h-4 w-4 text-[var(--ui-text-muted)] shrink-0" />
                                        <input
                                            className="input"
                                            placeholder="github.com/..."
                                            value={formData.socialLinks.github ?? ''}
                                            onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, github: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <SelectField label="Field of Study" id="field" value={formData.field} onChange={(e) => setFormData({ ...formData, field: e.target.value })}>
                                    {PROFILE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                                </SelectField>
                                <SelectField label="Branch / Specialization" id="branch" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}>
                                    {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                                </SelectField>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <SelectField label="Year" id="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                                    {PROFILE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                </SelectField>
                                <SelectField label="Division" id="division" value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })}>
                                    {PROFILE_DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </SelectField>
                                <SelectField label="Gender" id="gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value as ProfileFormData['gender'] })}>
                                    {PROFILE_GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                                </SelectField>
                                <SelectField label="Account Type" id="accountVisibility" value={formData.accountVisibility} onChange={(e) => setFormData({ ...formData, accountVisibility: e.target.value as ProfileFormData['accountVisibility'] })}>
                                    {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                </SelectField>
                            </div>

                            <div className="flex justify-end pt-2">
                                <PrimaryButton type="submit" disabled={saving}>
                                    <Save className="h-4 w-4" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </PrimaryButton>
                            </div>
                        </form>

                        {/* ── Backup & Restore ─────────────────── */}
                        {canUploadToDrive && (
                            <div className="mt-6 pt-6 border-t border-[var(--ui-border)]">
                                <SectionHeader
                                    icon={HardDriveUpload}
                                    title="Backup & Restore"
                                    subtitle="Export your profile to Google Drive or restore from a backup"
                                />
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <PrimaryButton onClick={handleExportBackup} disabled={backupBusy}>
                                        <Upload className="h-4 w-4" /> {backupBusy ? 'Working...' : 'Export to Drive'}
                                    </PrimaryButton>
                                    <SecondaryButton onClick={handleListBackups} disabled={backupBusy}>
                                        <Download className="h-4 w-4" /> {backupBusy ? 'Loading...' : 'Restore from Drive'}
                                    </SecondaryButton>
                                </div>

                                {showBackups && (
                                    <div className="mt-4 space-y-2 animate-[fade-in-up_0.2s_ease-out]">
                                        {backupFiles.length === 0 && !backupBusy && (
                                            <p className="text-sm text-[var(--ui-text-muted)]">No backup files found on your Google Drive.</p>
                                        )}
                                        {backupFiles.map((file) => (
                                            <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] p-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm text-[var(--ui-text)] truncate">{file.name}</p>
                                                    <p className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">
                                                        {new Date(file.modifiedTime).toLocaleString()}
                                                    </p>
                                                </div>
                                                <SecondaryButton
                                                    onClick={() => handleImportBackup(file.id, file.name)}
                                                    disabled={backupBusy}
                                                >
                                                    <Download className="h-3.5 w-3.5" /> Restore
                                                </SecondaryButton>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </GlassCard>
                )}

                {/* ═══════════ STORIES TAB ═══════════ */}
                {activeTab === 'stories' && (
                    <GlassCard>
                        <SectionHeader
                            icon={Clock}
                            title="Stories"
                            subtitle="Auto-expire in 24 hours · Public or Private"
                            action={
                                <SecondaryButton onClick={() => setShowAddStory(!showAddStory)}>
                                    {showAddStory ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {showAddStory ? 'Close' : 'Add Story'}
                                </SecondaryButton>
                            }
                        />

                        {/* Add Story Form — Drive upload only */}
                        {showAddStory && (
                            <form className="mt-5 p-4 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] space-y-3 animate-[fade-in-up_0.2s_ease-out]" onSubmit={addStory}>
                                {storyDraft.imageSource && (
                                    <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-[var(--ui-border)]">
                                        <img src={storyDraft.imageSource} alt="Story preview" className="h-full w-full object-cover" onError={handleImgError} />
                                        <button type="button" onClick={() => setStoryDraft((p) => ({ ...p, imageSource: '' }))} className="absolute top-1 right-1 h-5 w-5 rounded bg-black/60 flex items-center justify-center">
                                            <X className="h-3 w-3 text-white" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 items-end">
                                    <SelectField label="Visibility" id="storyVisibility" value={storyDraft.visibility} onChange={(e) => setStoryDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}>
                                        {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                    </SelectField>
                                    <div className="flex items-end gap-2">
                                        <PrimaryButton
                                            type="button"
                                            disabled={!canUploadToDrive || !!uploadingTarget}
                                            onClick={() => storyFileInputRef.current?.click()}
                                        >
                                            <ImagePlus className="h-4 w-4" /> {uploadingTarget === 'story' ? 'Uploading...' : 'Pick Image'}
                                        </PrimaryButton>
                                        {storyDraft.imageSource && (
                                            <SecondaryButton type="submit" disabled={busy}>
                                                <Upload className="h-4 w-4" /> {busy ? 'Saving...' : 'Upload Story'}
                                            </SecondaryButton>
                                        )}
                                    </div>
                                </div>
                                <input ref={storyFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleStoryFileChange} />
                            </form>
                        )}

                        {/* Stories Grid */}
                        <div className="mt-5">
                            {activeStories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                        <Clock className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                    </div>
                                    <p className="text-sm text-[var(--ui-text-muted)]">No active stories</p>
                                    <p className="text-xs text-[var(--ui-text-muted)] mt-1">Stories disappear after 24 hours</p>
                                </div>
                            ) : (
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {activeStories.map((story) => (
                                        <div key={story.id} className="group relative min-w-35 max-w-35 shrink-0">
                                            <div className="relative overflow-hidden rounded-2xl ring-2 ring-[var(--ui-accent)]/30 shadow-lg">
                                                <img
                                                    src={story.imageUrl}
                                                    alt="Story"
                                                    onError={handleImgError}
                                                    className="h-50 w-full object-cover object-center bg-[var(--ui-bg-elevated)] transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <div className="flex items-center gap-1 text-[10px] text-white/80">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDistanceToNowStrict(new Date(story.expiresAt))}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-white/60 mt-0.5">
                                                        {story.visibility === 'public' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                        {visibilityLabel(story.visibility)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeStory(story.id)}
                                                    className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200 shadow-lg"
                                                    title="Remove story"
                                                >
                                                    <X className="h-3.5 w-3.5 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {/* ═══════════ HIGHLIGHTS TAB ═══════════ */}
                {activeTab === 'highlights' && (
                    <GlassCard>
                        <SectionHeader
                            icon={Star}
                            title="Highlights"
                            subtitle="Save key moments permanently"
                            action={
                                <SecondaryButton onClick={() => setShowAddHighlight(!showAddHighlight)}>
                                    {showAddHighlight ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {showAddHighlight ? 'Close' : 'Add Highlight'}
                                </SecondaryButton>
                            }
                        />

                        {showAddHighlight && (
                            <form className="mt-5 p-4 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] space-y-3 animate-[fade-in-up_0.2s_ease-out]" onSubmit={addHighlight}>
                                <InputField
                                    label="Title"
                                    id="highlightTitle"
                                    value={highlightDraft.title}
                                    onChange={(e) => setHighlightDraft((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. College Fest 2026"
                                />
                                {highlightDraft.coverSource && (
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--ui-border)]">
                                        <img src={highlightDraft.coverSource} alt="Cover preview" className="h-full w-full object-cover" onError={handleImgError} />
                                        <button type="button" onClick={() => setHighlightDraft((p) => ({ ...p, coverSource: '' }))} className="absolute top-1 right-1 h-5 w-5 rounded bg-black/60 flex items-center justify-center">
                                            <X className="h-3 w-3 text-white" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 items-end">
                                    <SelectField label="Visibility" id="highlightVisibility" value={highlightDraft.visibility} onChange={(e) => setHighlightDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}>
                                        {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                    </SelectField>
                                    <PrimaryButton
                                        type="button"
                                        disabled={!canUploadToDrive || !!uploadingTarget}
                                        onClick={() => highlightFileInputRef.current?.click()}
                                    >
                                        <ImagePlus className="h-4 w-4" /> {uploadingTarget === 'highlight' ? 'Uploading...' : 'Pick Cover Image'}
                                    </PrimaryButton>
                                    {highlightDraft.coverSource && (
                                        <SecondaryButton type="submit" disabled={busy}>
                                            <Plus className="h-4 w-4" /> {busy ? 'Adding...' : 'Add Highlight'}
                                        </SecondaryButton>
                                    )}
                                </div>
                                {!driveConnected && (
                                    <p className="text-[11px] text-[var(--ui-text-muted)]">Connect Google Drive in Settings to upload</p>
                                )}
                                <input ref={highlightFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleHighlightFileChange} />
                            </form>
                        )}

                        <div className="mt-5">
                            {userProfile.highlights.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                        <Star className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                    </div>
                                    <p className="text-sm text-[var(--ui-text-muted)]">No highlights yet</p>
                                    <p className="text-xs text-[var(--ui-text-muted)] mt-1">Pin your best moments here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {userProfile.highlights.map((highlight) => (
                                        <div key={highlight.id} className="group relative">
                                            <div className="relative overflow-hidden rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] transition-all duration-300 hover:border-[var(--ui-accent)]/25">
                                                <img
                                                    src={highlight.coverImageUrl}
                                                    alt={highlight.title}
                                                    onError={handleImgError}
                                                    className="h-28 sm:h-32 w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <p className="text-sm font-semibold text-white truncate">{highlight.title}</p>
                                                    <div className="flex items-center gap-1 text-[10px] text-white/60 mt-0.5">
                                                        {highlight.visibility === 'public' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                        {visibilityLabel(highlight.visibility)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeHighlight(highlight.id)}
                                                    className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200 shadow-lg"
                                                    title="Remove highlight"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {/* ═══════════ GALLERY TAB ═══════════ */}
                {activeTab === 'gallery' && (
                    <GlassCard>
                        <SectionHeader
                            icon={GalleryHorizontalEnd}
                            title="Photo Gallery"
                            subtitle="Showcase your photos with captions"
                            action={
                                <SecondaryButton onClick={() => setShowAddGallery(!showAddGallery)}>
                                    {showAddGallery ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {showAddGallery ? 'Close' : 'Add Photo'}
                                </SecondaryButton>
                            }
                        />

                        {showAddGallery && (
                            <form className="mt-5 p-4 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] space-y-3 animate-[fade-in-up_0.2s_ease-out]" onSubmit={addGalleryItem}>
                                {galleryDraft.imageSource && (
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--ui-border)]">
                                        <img src={galleryDraft.imageSource} alt="Gallery preview" className="h-full w-full object-cover" onError={handleImgError} />
                                        <button type="button" onClick={() => setGalleryDraft((p) => ({ ...p, imageSource: '' }))} className="absolute top-1 right-1 h-5 w-5 rounded bg-black/60 flex items-center justify-center">
                                            <X className="h-3 w-3 text-white" />
                                        </button>
                                    </div>
                                )}
                                <InputField
                                    label="Caption (optional)"
                                    id="galleryCaption"
                                    value={galleryDraft.caption}
                                    onChange={(e) => setGalleryDraft((prev) => ({ ...prev, caption: e.target.value }))
                                    }
                                    placeholder="A moment to remember..."
                                />
                                <div className="flex flex-wrap gap-3 items-end">
                                    <SelectField label="Visibility" id="galleryVisibility" value={galleryDraft.visibility} onChange={(e) => setGalleryDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}>
                                        {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                    </SelectField>
                                    <PrimaryButton
                                        type="button"
                                        disabled={!canUploadToDrive || !!uploadingTarget}
                                        onClick={() => galleryFileInputRef.current?.click()}
                                    >
                                        <ImagePlus className="h-4 w-4" /> {uploadingTarget === 'gallery' ? 'Uploading...' : 'Pick Image'}
                                    </PrimaryButton>
                                    {galleryDraft.imageSource && (
                                        <SecondaryButton type="submit" disabled={busy}>
                                            <Plus className="h-4 w-4" /> {busy ? 'Adding...' : 'Add Photo'}
                                        </SecondaryButton>
                                    )}
                                </div>
                                {!driveConnected && (
                                    <p className="text-[11px] text-[var(--ui-text-muted)]">Connect Google Drive in Settings to upload</p>
                                )}
                                <input ref={galleryFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFileChange} />
                            </form>
                        )}

                        <div className="mt-5">
                            {userProfile.gallery.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                        <Grid3X3 className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                    </div>
                                    <p className="text-sm text-[var(--ui-text-muted)]">No photos yet</p>
                                    <p className="text-xs text-[var(--ui-text-muted)] mt-1">Start building your gallery</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {userProfile.gallery.map((item) => (
                                        <div key={item.id} className="group relative">
                                            <div
                                                className="relative overflow-hidden rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] cursor-pointer transition-all duration-300 hover:border-[var(--ui-accent)]/25"
                                                onClick={() => setGalleryPreview(galleryPreview === item.id ? null : item.id)}
                                            >
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.caption || 'Gallery photo'}
                                                    onError={handleImgError}
                                                    className={`w-full object-cover object-center transition-all duration-500 ${
                                                        galleryPreview === item.id ? 'h-auto max-h-96' : 'h-36 sm:h-44'
                                                    } group-hover:scale-[1.02]`}
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                    {item.caption && (
                                                        <p className="text-sm text-white font-medium truncate">{item.caption}</p>
                                                    )}
                                                    <div className="flex items-center gap-1 text-[10px] text-white/60 mt-0.5">
                                                        {item.visibility === 'public' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                        {visibilityLabel(item.visibility)}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeGalleryItem(item.id); }}
                                                    className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200 shadow-lg"
                                                    title="Remove photo"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {/* ═══════════ ACTIVITY LOG TAB ═══════════ */}
                {activeTab === 'activity' && (
                    <GlassCard>
                        <SectionHeader
                            icon={ScrollText}
                            title="Activity Log"
                            subtitle="Your recent actions and changes"
                        />

                        <div className="mt-5">
                            {loadingLogs ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-8 w-8 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                                </div>
                            ) : activityLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                        <ScrollText className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                    </div>
                                    <p className="text-sm text-[var(--ui-text-muted)]">No activity yet</p>
                                    <p className="text-xs text-[var(--ui-text-muted)] mt-1">Your actions will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activityLogs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3 rounded-lg border border-[var(--ui-border)] p-3 hover:bg-[var(--ui-bg-hover)] transition-colors">
                                            <div className="h-8 w-8 shrink-0 rounded-lg bg-[var(--ui-accent-dim)] flex items-center justify-center mt-0.5">
                                                <ActivityIcon action={log.action} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[var(--ui-text)]">{log.details}</p>
                                                <p className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">
                                                    {formatDistanceToNowStrict(new Date(log.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <Badge>{log.action.replace(/_/g, ' ')}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

            </div>
        </DashboardLayout>
    );
}

/* ── Activity icon mapper ── */
function ActivityIcon({ action }: { action: string }) {
    const className = "h-4 w-4 text-[var(--ui-accent)]";
    switch (action) {
        case 'profile_update': return <Edit3 className={className} />;
        case 'gallery_add': return <ImagePlus className={className} />;
        case 'gallery_remove': return <Trash2 className={className} />;
        case 'story_add': return <Clock className={className} />;
        case 'story_remove': return <Trash2 className={className} />;
        case 'highlight_add': return <Star className={className} />;
        case 'highlight_remove': return <Trash2 className={className} />;
        case 'drive_upload': return <Upload className={className} />;
        case 'backup_export': return <HardDriveUpload className={className} />;
        case 'backup_import': return <Download className={className} />;
        case 'login': return <User className={className} />;
        default: return <Sparkles className={className} />;
    }
}
