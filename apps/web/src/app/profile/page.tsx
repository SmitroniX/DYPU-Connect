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
    requestGoogleDriveAccessToken,
    uploadImageToGoogleDrive,
    loadGoogleIdentityScript,
    isGoogleDriveConfigured,
} from '@/lib/googleDrive';
import { logActivity, fetchActivityLog, type ActivityLogEntry } from '@/lib/activityLog';
import type {
    ProfileGalleryItem,
    ProfileHighlightItem,
    ProfileStoryItem,
    ProfileVisibility,
    UserProfile,
} from '@/types/profile';
import {
    PROFILE_VISIBILITY_OPTIONS,
    STORY_TTL_MS,
} from '@/types/profile';
import { resolveProfileImage } from '@/lib/profileImage';
import {
    Award,
    ChevronUp,
    Clock,
    Download,
    Edit3,
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
    ScrollText,
    ShieldCheck,
    Sparkles,
    Star,
    Trash2,
    Upload,
    User,
    X,
    Zap,
} from 'lucide-react';

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
    const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-sm transition-all duration-300 hover:scale-105';
    const styles: Record<string, string> = {
        default: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
        accent: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_10px_rgba(217,70,239,0.2)]',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    };
    return <span className={`${base} ${styles[variant]}`}>{children}</span>;
}

function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: React.ElementType; title: string; subtitle: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900/80 border border-zinc-700/50 shadow-inner overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Icon className="relative z-10 h-6 w-6 text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-300" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
                    <p className="text-sm font-medium text-zinc-400 mt-1">{subtitle}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`relative overflow-hidden rounded-3xl bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/60 shadow-2xl transition-all duration-300 ${className}`}>
            <div className="absolute inset-0 bg-linear-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="relative z-10 p-6 sm:p-8">
                {children}
            </div>
        </div>
    );
}

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="group">
            <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 transition-colors group-focus-within:text-blue-400">{label}</label>
            <input
                id={id}
                className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600"
                {...props}
            />
        </div>
    );
}

function SelectField({ label, id, children, ...props }: { label: string; id: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="group">
            <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 transition-colors group-focus-within:text-blue-400">{label}</label>
            <div className="relative">
                <select
                    id={id}
                    className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none"
                    {...props}
                >
                    {children}
                </select>
                <ChevronUp className="h-4 w-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-180 pointer-events-none" />
            </div>
        </div>
    );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            {...props}
        >
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
    );
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-5 py-3 text-sm font-bold text-zinc-300 transition-all duration-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
            {...props}
        >
            {children}
        </button>
    );
}

/* ── Tab selector ───────────────────────────────── */

type ProfileTab = 'stories' | 'highlights' | 'gallery' | 'activity';

function TabBar({ activeTab, setActiveTab, storiesCount, highlightsCount, galleryCount }: {
    activeTab: ProfileTab;
    setActiveTab: (tab: ProfileTab) => void;
    storiesCount: number;
    highlightsCount: number;
    galleryCount: number;
}) {
    const tabs: { key: ProfileTab; label: string; icon: React.ElementType; count?: number }[] = [
        { key: 'stories', label: 'Stories', icon: Clock, count: storiesCount },
        { key: 'highlights', label: 'Highlights', icon: Star, count: highlightsCount },
        { key: 'gallery', label: 'Gallery', icon: Grid3X3, count: galleryCount },
        { key: 'activity', label: 'Activity', icon: ScrollText },
    ];

    return (
        <div className="flex gap-2 p-1.5 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 overflow-x-auto custom-scrollbar shadow-inner relative z-10">
            {tabs.map(({ key, label, icon: TabIcon, count }) => {
                const isActive = activeTab === key;
                return (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`relative flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 whitespace-nowrap overflow-hidden group ${
                            isActive
                                ? 'text-white'
                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                    >
                        {isActive && (
                            <div className="absolute inset-0 bg-zinc-800/80 shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-xl" />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <TabIcon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400/70 transition-colors'}`} />
                            <span className="hidden sm:inline">{label}</span>
                        </span>
                        {count !== undefined && count > 0 && (
                            <span className={`relative z-10 ml-1 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider ${
                                isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Main Page ──────────────────────────────────── */

export default function ProfilePage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const router = useRouter();
    const storyFileInputRef = useRef<HTMLInputElement>(null);
    const highlightFileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<ProfileTab>('gallery');
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

    // Only populate form from profile on first load (not on every profile change)
    const storiesCleanedRef = useRef(false);

    useEffect(() => {
        if (!user) { router.replace('/login'); return; }
        if (!userProfile) { router.replace('/setup-profile'); return; }
    }, [router, user, userProfile]);

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
        
        // Preload Google Identity script so that popup doesn't get blocked later
        if (isGoogleDriveConfigured()) {
            loadGoogleIdentityScript().catch(() => { /* ignore */ });
        }

        return () => window.clearInterval(timer);
    }, []);

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
                            <div className="h-12 w-12 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        </div>
                        <p className="text-sm text-(--ui-text-muted) animate-pulse">Loading profile...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const createdOn = new Date(userProfile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const resolvedPreviewImage = resolveProfileImage(userProfile.profileImage, userProfile.email, userProfile.name);
    const fallbackSrc = resolveProfileImage('', userProfile.email, userProfile.name);
    const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = fallbackSrc;
    };
    const profileCompletion = computeProfileCompletion(userProfile);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-6 px-2 sm:px-4 space-y-6">

                {/* ═══════════ HERO PROFILE HEADER ═══════════ */}
                <div className="relative overflow-hidden rounded-4xl bg-zinc-950 border border-zinc-800/60 shadow-2xl mb-8">
                    {/* Vibrant Neon Gradient Banner */}
                    <div className="h-44 sm:h-56 bg-linear-to-br from-violet-600/40 via-fuchsia-600/20 to-blue-600/40 relative overflow-hidden">
                        {/* Animated gradient orbs */}
                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/30 rounded-full mix-blend-screen filter blur-[100px] animate-[pulse_8s_infinite]" />
                        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-screen filter blur-[100px] animate-[pulse_10s_infinite_reverse]" />
                        
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMyAxLjM0MyAzIDNzLTEuMzQzIDMtMyAzLTMtMS4zNDMtMy0zIDEuMzQzLTMgMy0zek0yNCAzNmMxLjY1NyAwIDMgMS4zNDMgMyAzcy0xLjM0MyAzLTMgMy0zLTEuMzQzLTMtMyAxLjM0My0zIDMtM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10 mix-blend-overlay" />
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-zinc-950 to-transparent" />
                        
                        {/* Encryption badge on banner */}
                        {userProfile.encryptionEnabled && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-zinc-950/50 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <ShieldCheck className="h-4 w-4" /> Encrypted
                            </div>
                        )}
                    </div>

                    {/* Profile Info Overlay */}
                    <div className="relative -mt-20 sm:-mt-24 px-6 sm:px-10 pb-10">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
                            {/* Avatar with Neon Completion Ring */}
                            <div className="relative group shrink-0">
                                {/* The glowing ring background effect */}
                                <div className="absolute -inset-1 rounded-full bg-linear-to-br from-violet-500 via-fuchsia-500 to-blue-500 opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500" />
                                
                                <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full p-2 bg-zinc-950 z-10">
                                    {/* SVG Progress Ring */}
                                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                        <circle 
                                            cx="50" cy="50" r="48" fill="none" 
                                            stroke="url(#gradient)" strokeWidth="4" 
                                            strokeLinecap="round"
                                            strokeDasharray={`${301.59 * (profileCompletion / 100)} 301.59`}
                                            className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]"
                                        />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#8b5cf6" />
                                                <stop offset="50%" stopColor="#d946ef" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    
                                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                                        <img
                                            src={resolvedPreviewImage}
                                            alt={userProfile.name}
                                            onError={handleImgError}
                                            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                    
                                    {/* Completion tooltip */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] font-black px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        {profileCompletion}% Complete
                                    </div>
                                </div>
                            </div>

                            {/* Name & Details */}
                            <div className="flex-1 text-center sm:text-left space-y-3 pb-2 w-full">
                                <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-3">
                                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                                        {userProfile.name}
                                    </h1>
                                    <div className="flex gap-2">
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${userProfile.accountVisibility === 'public' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {userProfile.accountVisibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                            {visibilityLabel(userProfile.accountVisibility)}
                                        </div>
                                        {userProfile.role === 'admin' && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                                                <Sparkles className="h-3 w-3" /> Admin
                                            </div>
                                        )}
                                        <button
                                            onClick={() => router.replace('/profile/edit')}
                                            className="ml-2 flex flex-none items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors whitespace-nowrap border border-zinc-700 shadow-sm"
                                        >                                            <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                                        </button>
                                    </div>
                                </div>

                                {/* Bio */}
                                {userProfile.bio && (
                                    <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
                                        {userProfile.bio}
                                    </p>
                                )}

                                {/* Academic Glass Cards */}
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md text-left">
                                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Field</span>
                                        <span className="text-sm font-bold text-zinc-200">{userProfile.field}</span>
                                    </div>
                                    {userProfile.branch && (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md text-left">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Branch</span>
                                            <span className="text-sm font-bold text-zinc-200">{userProfile.branch}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md text-left">
                                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Year/Div</span>
                                        <span className="text-sm font-bold text-zinc-200">{userProfile.year} • {userProfile.division}</span>
                                    </div>
                                </div>

                                {/* Social Links */}
                                {(userProfile.socialLinks?.instagram || userProfile.socialLinks?.linkedin || userProfile.socialLinks?.github) && (
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                                        {userProfile.socialLinks.instagram && (
                                            <a href={`https://instagram.com/${userProfile.socialLinks.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-2 rounded-xl bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 text-xs font-bold text-pink-400 hover:bg-pink-500 hover:text-white transition-all duration-300">
                                                <Instagram className="h-4 w-4" /> {userProfile.socialLinks.instagram}
                                            </a>
                                        )}
                                        {userProfile.socialLinks.linkedin && (
                                            <a href={userProfile.socialLinks.linkedin.startsWith('http') ? userProfile.socialLinks.linkedin : `https://linkedin.com/in/${userProfile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all duration-300">
                                                <Linkedin className="h-4 w-4" /> LinkedIn
                                            </a>
                                        )}
                                        {userProfile.socialLinks.github && (
                                            <a href={userProfile.socialLinks.github.startsWith('http') ? userProfile.socialLinks.github : `https://github.com/${userProfile.socialLinks.github}`} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white hover:text-black transition-all duration-300">
                                                <Github className="h-4 w-4" /> {userProfile.socialLinks.github}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Badges / Stats Footer */}
                        <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800">
                                    <Mail className="h-4 w-4" /> {userProfile.email}
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400 text-sm bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800">
                                    <User className="h-4 w-4" /> {userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1)}
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 text-xs pl-2">
                                    Member since {createdOn}
                                </div>
                            </div>

                            {/* Achievement Pills */}
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {profileCompletion >= 80 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1.5 text-[10px] font-black text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.15)] outline outline-yellow-500/50 outline-offset-1">
                                        <Award className="h-3.5 w-3.5" /> PROFILE PRO
                                    </span>
                                )}
                                {userProfile.googleDrive && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-[10px] font-black text-blue-400 border border-blue-500/20">
                                        <HardDriveUpload className="h-3.5 w-3.5" /> DRIVE
                                    </span>
                                )}
                                {userProfile.gallery.length >= 5 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-[10px] font-black text-orange-400 border border-orange-500/20">
                                        <Zap className="h-3.5 w-3.5" /> SHUTTERBUG
                                    </span>
                                )}
                            </div>
                        </div>
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
                            <form className="mt-5 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-inner space-y-4 animate-[fade-in-up_0.2s_ease-out] relative overflow-hidden" onSubmit={addStory}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full filter blur-[50px] pointer-events-none" />
                                {storyDraft.imageSource && (
                                    <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-(--ui-border)">
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
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-4xl bg-zinc-900/30 border border-zinc-800/50 border-dashed backdrop-blur-sm">
                                    <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                                        <Clock className="h-8 w-8 text-zinc-500" />
                                    </div>
                                    <p className="text-sm text-(--ui-text-muted)">No active stories</p>
                                    <p className="text-xs text-(--ui-text-muted) mt-1">Stories disappear after 24 hours</p>
                                </div>
                            ) : (
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {activeStories.map((story) => (
                                        <div key={story.id} className="group relative min-w-35 max-w-35 shrink-0">
                                            <div className="relative overflow-hidden rounded-4xl ring-1 ring-zinc-800 bg-zinc-950/50 shadow-2xl transition-all duration-300 hover:ring-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(217,70,239,0.2)] hover:-translate-y-1">
                                                <img
                                                    src={story.imageUrl}
                                                    alt="Story"
                                                    onError={handleImgError}
                                                    className="h-50 w-full object-cover object-center bg-zinc-900 transition-transform duration-500 group-hover:scale-110"
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
                            <form className="mt-5 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-inner space-y-4 animate-[fade-in-up_0.2s_ease-out] relative overflow-hidden" onSubmit={addHighlight}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full filter blur-[50px] pointer-events-none" />
                                <InputField
                                    label="Title"
                                    id="highlightTitle"
                                    value={highlightDraft.title}
                                    onChange={(e) => setHighlightDraft((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. College Fest 2026"
                                />
                                {highlightDraft.coverSource && (
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-(--ui-border)">
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
                                    <p className="text-[11px] text-(--ui-text-muted)">Connect Google Drive in Settings to upload</p>
                                )}
                                <input ref={highlightFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleHighlightFileChange} />
                            </form>
                        )}

                        <div className="mt-5">
                            {userProfile.highlights.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-4xl bg-zinc-900/30 border border-zinc-800/50 border-dashed backdrop-blur-sm">
                                    <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                                        <Star className="h-8 w-8 text-zinc-500" />
                                    </div>
                                    <p className="text-sm text-(--ui-text-muted)">No highlights yet</p>
                                    <p className="text-xs text-(--ui-text-muted) mt-1">Pin your best moments here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {userProfile.highlights.map((highlight) => (
                                        <div key={highlight.id} className="group relative">
                                            <div className="relative overflow-hidden rounded-4xl bg-zinc-950/50 ring-1 ring-zinc-800 shadow-2xl transition-all duration-300 hover:ring-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:-translate-y-1">
                                                <img
                                                    src={highlight.coverImageUrl}
                                                    alt={highlight.title}
                                                    onError={handleImgError}
                                                    className="h-28 sm:h-32 w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
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
                            <form className="mt-5 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-inner space-y-4 animate-[fade-in-up_0.2s_ease-out] relative overflow-hidden" onSubmit={addGalleryItem}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-[50px] pointer-events-none" />
                                {galleryDraft.imageSource && (
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-(--ui-border)">
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
                                    <p className="text-[11px] text-(--ui-text-muted)">Connect Google Drive in Settings to upload</p>
                                )}
                                <input ref={galleryFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFileChange} />
                            </form>
                        )}

                        <div className="mt-5">
                            {userProfile.gallery.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-4xl bg-zinc-900/30 border border-zinc-800/50 border-dashed backdrop-blur-sm">
                                    <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                                        <Grid3X3 className="h-8 w-8 text-zinc-500" />
                                    </div>
                                    <p className="text-sm text-(--ui-text-muted)">No photos yet</p>
                                    <p className="text-xs text-(--ui-text-muted) mt-1">Start building your gallery</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {userProfile.gallery.map((item) => (
                                        <div key={item.id} className="group relative">
                                            <div
                                                className="relative overflow-hidden rounded-4xl bg-zinc-950/50 ring-1 ring-zinc-800 shadow-2xl transition-all duration-300 cursor-pointer hover:ring-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
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
                                    <div className="h-16 w-16 rounded-2xl bg-(--ui-bg-elevated) flex items-center justify-center mb-4">
                                        <ScrollText className="h-8 w-8 text-(--ui-text-muted)" />
                                    </div>
                                    <p className="text-sm text-(--ui-text-muted)">No activity yet</p>
                                    <p className="text-xs text-(--ui-text-muted) mt-1">Your actions will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activityLogs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3 rounded-lg border border-(--ui-border) p-3 hover:bg-[var(--ui-bg-hover)] transition-colors">
                                            <div className="h-8 w-8 shrink-0 rounded-lg bg-[var(--ui-accent-dim)] flex items-center justify-center mt-0.5">
                                                <ActivityIcon action={log.action} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[var(--ui-text)]">{log.details}</p>
                                                <p className="text-[10px] text-(--ui-text-muted) mt-0.5">
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
