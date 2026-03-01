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
    Camera,
    ChevronUp,
    Clock,
    Edit3,
    Eye,
    EyeOff,
    GalleryHorizontalEnd,
    Globe,
    Grid3X3,
    ImagePlus,
    Lock,
    Mail,
    Plus,
    Save,
    Sparkles,
    Star,
    Trash2,
    Upload,
    User,
    X,
} from 'lucide-react';

interface EditableProfileData extends ProfileFormData {
    profileImage: string;
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

function getValidHttpUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

/* ── Tiny reusable UI pieces ─────────────────────── */

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' | 'success' | 'warning' }) {
    const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase';
    const styles: Record<string, string> = {
        default: 'bg-white/10 text-slate-300',
        accent: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30',
        success: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    };
    return <span className={`${base} ${styles[variant]}`}>{children}</span>;
}

function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: React.ElementType; title: string; subtitle: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-indigo-500/20 ring-1 ring-violet-500/20">
                    <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`glass p-5 sm:p-6 transition-all duration-300 hover:border-white/15 ${className}`}>
            {children}
        </div>
    );
}

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
            <input
                id={id}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                {...props}
            />
        </div>
    );
}

function SelectField({ label, id, children, ...props }: { label: string; id: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
            <select
                id={id}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all appearance-none"
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            {...props}
        >
            {children}
        </button>
    );
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            {...props}
        >
            {children}
        </button>
    );
}

/* ── Tab selector ───────────────────────────────── */

type ProfileTab = 'edit' | 'stories' | 'highlights' | 'gallery';

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
    ];

    return (
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/5">
            {tabs.map(({ key, label, icon: TabIcon, count }) => (
                <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
                        activeTab === key
                            ? 'bg-linear-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <TabIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                    {count !== undefined && count > 0 && (
                        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            activeTab === key ? 'bg-white/20' : 'bg-white/10'
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

    // Only reset branch when the field actually changes, not on every render
    useEffect(() => {
        if (formData.field !== prevFieldRef.current) {
            prevFieldRef.current = formData.field;
            if (!branchOptions.includes(formData.branch)) {
                setFormData((prev) => ({ ...prev, branch: branchOptions[0] }));
            }
        }
    }, [branchOptions, formData.branch, formData.field]);

    // Clean up expired stories — run only once per page load, not on every tick
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

    // Use fresh store state to avoid stale closure bugs when overlapping async ops
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
            const profileUpdates = {
                name: cleanName,
                field: formData.field,
                year: formData.year,
                division: formData.division,
                branch: formData.branch.trim(),
                gender: formData.gender,
                accountVisibility: formData.accountVisibility,
                profileImage: resolveProfileImage(formData.profileImage.trim(), userProfile.email, cleanName),
            };
            await applyProfileUpdates(profileUpdates, 'Profile updated successfully.');
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
        const imageUrl = getValidHttpUrl(galleryDraft.imageSource);
        if (!userProfile || !imageUrl) { toast.error('Add a valid image URL for the gallery photo.'); return; }
        const item: ProfileGalleryItem = { id: createClientId('gallery'), imageUrl, caption: galleryDraft.caption.trim(), visibility: galleryDraft.visibility, createdAt: Date.now() };
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ gallery: [item, ...(freshProfile?.gallery ?? [])] }, 'Gallery updated.');
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
            if (galleryPreview === itemId) setGalleryPreview(null);
        } catch { toast.error('Failed to remove gallery photo.'); }
        finally { setBusy(false); }
    };

    const addStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        const imageUrl = getValidHttpUrl(storyDraft.imageSource);
        if (!userProfile || !imageUrl) { toast.error('Add a valid image URL for your story.'); return; }
        const createdAt = Date.now();
        const story: ProfileStoryItem = { id: createClientId('story'), imageUrl, visibility: storyDraft.visibility, createdAt, expiresAt: createdAt + STORY_TTL_MS };
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ stories: [story, ...(freshProfile?.stories ?? [])] }, 'Story uploaded.');
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
        } catch { toast.error('Failed to remove story.'); }
        finally { setBusy(false); }
    };

    const addHighlight = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || busy) return;
        const cleanTitle = highlightDraft.title.trim();
        const cleanCover = getValidHttpUrl(highlightDraft.coverSource);
        if (!cleanTitle || !cleanCover) { toast.error('Add a highlight title and a valid image URL.'); return; }
        const highlight: ProfileHighlightItem = { id: createClientId('highlight'), title: cleanTitle, coverImageUrl: cleanCover, visibility: highlightDraft.visibility, createdAt: Date.now() };
        setBusy(true);
        try {
            const freshProfile = useStore.getState().userProfile;
            await applyProfileUpdates({ highlights: [highlight, ...(freshProfile?.highlights ?? [])] }, 'Highlight added.');
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
        } catch { toast.error('Failed to remove highlight.'); }
        finally { setBusy(false); }
    };

    const activeStories = useMemo(
        () => (userProfile?.stories ?? []).filter((s) => s.expiresAt > currentTime),
        [userProfile?.stories, currentTime]
    );

    const driveConfigured = isGoogleDriveConfigured();
    const driveConnected = !!userProfile?.googleDrive;
    const canUploadToDrive = driveConfigured && driveConnected;

    const uploadImageFileToDrive = async (file: File, target: 'profile' | 'story' | 'highlight' | 'gallery'): Promise<string | null> => {
        if (!userProfile?.googleDrive) { toast.error('Connect Google Drive from Settings first.'); return null; }
        if (!driveConfigured) { toast.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local'); return null; }
        if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return null; }
        setUploadingTarget(target);
        try {
            let accessToken: string;
            try { accessToken = await requestGoogleDriveAccessToken(''); }
            catch { accessToken = await requestGoogleDriveAccessToken('consent'); }
            const uploadResult = await uploadImageToGoogleDrive({ accessToken, file, folderId: userProfile.googleDrive.folderId });
            toast.success('Image uploaded to Google Drive.');
            return uploadResult.directImageUrl;
        } catch (error) {
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

    /* ── Loading state ───────────────────────────── */
    if (!user || !userProfile) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                        </div>
                        <p className="text-sm text-slate-400 animate-pulse">Loading profile...</p>
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

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-6 px-2 sm:px-4 space-y-6">

                {/* ═══════════ HERO PROFILE HEADER ═══════════ */}
                <div className="relative overflow-hidden rounded-2xl">
                    {/* Gradient Banner */}
                    <div className="h-36 sm:h-44 bg-linear-to-br from-violet-600 via-indigo-600 to-purple-700 relative">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMyAxLjM0MyAzIDNzLTEuMzQzIDMtMyAzLTMtMS4zNDMtMy0zIDEuMzQzLTMgMy0zek0yNCAzNmMxLjY1NyAwIDMgMS4zNDMgMyAzcy0xLjM0MyAzLTMgMy0zLTEuMzQzLTMtMyAxLjM0My0zIDMtM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-slate-950/80 to-transparent" />
                    </div>

                    {/* Profile Info Overlay */}
                    <div className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl ring-4 ring-slate-950 overflow-hidden bg-white/10 shadow-2xl">
                                    <img
                                        src={resolvedPreviewImage}
                                        alt={formData.name || 'Profile'}
                                        onError={handleImgError}
                                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                <button
                                    onClick={() => setActiveTab('edit')}
                                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg hover:bg-violet-500 transition-colors"
                                    title="Edit profile photo"
                                >
                                    <Camera className="h-4 w-4 text-white" />
                                </button>
                            </div>

                            {/* Name & Details */}
                            <div className="flex-1 text-center sm:text-left space-y-2 pb-1">
                                <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
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

                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-400">
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
                            </div>

                            {/* Stats */}
                            <div className="flex gap-6 sm:gap-8 text-center">
                                <div>
                                    <p className="text-xl font-bold text-white">{activeStories.length}</p>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Stories</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-white">{userProfile.highlights.length}</p>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Highlights</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-white">{userProfile.gallery.length}</p>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Gallery</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 mt-4 text-center sm:text-left">
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
                            {/* Profile Photo Section */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <img
                                    src={resolvedPreviewImage}
                                    alt="Preview"
                                    onError={handleImgError}
                                    className="h-16 w-16 rounded-xl object-cover object-center ring-2 ring-white/10"
                                />
                                <div className="flex-1 min-w-0 space-y-2">
                                    <InputField
                                        label="Profile Photo URL or Email"
                                        id="profileImage"
                                        value={formData.profileImage}
                                        onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                                        placeholder="https://... or you@dypatil.edu"
                                    />
                                    <div className="flex items-center gap-2">
                                        <SecondaryButton
                                            type="button"
                                            disabled={!canUploadToDrive || !!uploadingTarget}
                                            onClick={() => profilePhotoFileInputRef.current?.click()}
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                            {uploadingTarget === 'profile' ? 'Uploading...' : 'Upload to Drive'}
                                        </SecondaryButton>
                                        {!driveConnected && (
                                            <p className="text-[11px] text-slate-500">Connect Google Drive in Settings</p>
                                        )}
                                    </div>
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

                        {/* Add Story Form */}
                        {showAddStory && (
                            <form className="mt-5 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 animate-[fade-in-up_0.2s_ease-out]" onSubmit={addStory}>
                                <InputField
                                    label="Story Image URL"
                                    id="storyUrl"
                                    value={storyDraft.imageSource}
                                    onChange={(e) => setStoryDraft((prev) => ({ ...prev, imageSource: e.target.value }))}
                                    placeholder="https://your-story-image-url"
                                />
                                <div className="flex flex-wrap gap-3 items-end">
                                    <SelectField label="Visibility" id="storyVisibility" value={storyDraft.visibility} onChange={(e) => setStoryDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}>
                                        {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                    </SelectField>
                                    <div className="flex items-end gap-2">
                                        <PrimaryButton type="submit" disabled={busy}>
                                            <ImagePlus className="h-4 w-4" /> {busy ? 'Uploading...' : 'Upload Story'}
                                        </PrimaryButton>
                                        <SecondaryButton type="button" disabled={!canUploadToDrive || !!uploadingTarget} onClick={() => storyFileInputRef.current?.click()}>
                                            <Upload className="h-4 w-4" /> {uploadingTarget === 'story' ? 'Uploading...' : 'Pick File'}
                                        </SecondaryButton>
                                    </div>
                                </div>
                                <input ref={storyFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleStoryFileChange} />
                            </form>
                        )}

                        {/* Stories Grid */}
                        <div className="mt-5">
                            {activeStories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                        <Clock className="h-8 w-8 text-slate-600" />
                                    </div>
                                    <p className="text-sm text-slate-400">No active stories</p>
                                    <p className="text-xs text-slate-500 mt-1">Stories disappear after 24 hours</p>
                                </div>
                            ) : (
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {activeStories.map((story) => (
                                        <div key={story.id} className="group relative min-w-35 max-w-35 shrink-0">
                                            <div className="relative overflow-hidden rounded-2xl ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/10">
                                                <img
                                                    src={story.imageUrl}
                                                    alt="Story"
                                                    onError={handleImgError}
                                                    className="h-50 w-full object-cover object-center bg-white/10 transition-transform duration-300 group-hover:scale-105"
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
                            <form className="mt-5 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 animate-[fade-in-up_0.2s_ease-out]" onSubmit={addHighlight}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InputField
                                        label="Title"
                                        id="highlightTitle"
                                        value={highlightDraft.title}
                                        onChange={(e) => setHighlightDraft((prev) => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g. College Fest 2026"
                                    />
                                    <InputField
                                        label="Cover Image URL"
                                        id="highlightCover"
                                        value={highlightDraft.coverSource}
                                        onChange={(e) => setHighlightDraft((prev) => ({ ...prev, coverSource: e.target.value }))}
                                        placeholder="https://your-cover-url"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-3 items-end">
                                    <SelectField label="Visibility" id="highlightVisibility" value={highlightDraft.visibility} onChange={(e) => setHighlightDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}>
                                        {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                    </SelectField>
                                    <PrimaryButton type="submit" disabled={busy}>
                                        <Plus className="h-4 w-4" /> {busy ? 'Adding...' : 'Add Highlight'}
                                    </PrimaryButton>
                                    <SecondaryButton type="button" disabled={!canUploadToDrive || !!uploadingTarget} onClick={() => highlightFileInputRef.current?.click()}>
                                        <Upload className="h-4 w-4" /> {uploadingTarget === 'highlight' ? 'Uploading...' : 'Pick File'}
                                    </SecondaryButton>
                                </div>
                                <input ref={highlightFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleHighlightFileChange} />
                            </form>
                        )}

                        <div className="mt-5">
                            {userProfile.highlights.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                        <Star className="h-8 w-8 text-slate-600" />
                                    </div>
                                    <p className="text-sm text-slate-400">No highlights yet</p>
                                    <p className="text-xs text-slate-500 mt-1">Pin your best moments here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {userProfile.highlights.map((highlight) => (
                                        <div key={highlight.id} className="group relative">
                                            <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5">
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
                            <form className="mt-5 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 animate-[fade-in-up_0.2s_ease-out]" onSubmit={addGalleryItem}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InputField
                                        label="Image URL"
                                        id="galleryUrl"
                                        value={galleryDraft.imageSource}
                                        onChange={(e) => setGalleryDraft((prev) => ({ ...prev, imageSource: e.target.value }))
                                        }
                                        placeholder="https://your-photo-url"
                                    />
                                    <InputField
                                        label="Caption (optional)"
                                        id="galleryCaption"
                                        value={galleryDraft.caption}
                                        onChange={(e) => setGalleryDraft((prev) => ({ ...prev, caption: e.target.value }))
                                        }
                                        placeholder="A moment to remember..."
                                    />
                                </div>
                                <div className="flex flex-wrap gap-3 items-end">
                                    <SelectField label="Visibility" id="galleryVisibility" value={galleryDraft.visibility} onChange={(e) => setGalleryDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}>
                                        {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                                    </SelectField>
                                    <PrimaryButton type="submit">
                                        <ImagePlus className="h-4 w-4" /> Add Photo
                                    </PrimaryButton>
                                    <SecondaryButton type="button" disabled={!canUploadToDrive || !!uploadingTarget} onClick={() => galleryFileInputRef.current?.click()}>
                                        <Upload className="h-4 w-4" /> {uploadingTarget === 'gallery' ? 'Uploading...' : 'Pick File'}
                                    </SecondaryButton>
                                </div>
                                <input ref={galleryFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFileChange} />
                            </form>
                        )}

                        <div className="mt-5">
                            {userProfile.gallery.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                        <Grid3X3 className="h-8 w-8 text-slate-600" />
                                    </div>
                                    <p className="text-sm text-slate-400">No photos yet</p>
                                    <p className="text-xs text-slate-500 mt-1">Start building your gallery</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {userProfile.gallery.map((item) => (
                                        <div key={item.id} className="group relative">
                                            <div
                                                className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 cursor-pointer transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5"
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

                                                {/* Overlay info on hover */}
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

                {/* ═══════════ FIRESTORE INDEX TIP ═══════════ */}
                <div className="glass p-4">
                    <div className="flex items-start gap-3">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-slate-500" />
                        </div>
                        <p className="text-xs text-slate-500">
                            If you see Firestore index errors in the console, click the link in the error to create the required composite index in the Firebase Console.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
