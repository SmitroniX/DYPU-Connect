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
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export default function ProfilePage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const router = useRouter();
    const profilePhotoFileInputRef = useRef<HTMLInputElement>(null);
    const storyFileInputRef = useRef<HTMLInputElement>(null);
    const highlightFileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileInputRef = useRef<HTMLInputElement>(null);

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
    const [galleryDraft, setGalleryDraft] = useState<GalleryDraft>({
        imageSource: '',
        caption: '',
        visibility: 'public',
    });
    const [storyDraft, setStoryDraft] = useState<StoryDraft>({
        imageSource: '',
        visibility: 'public',
    });
    const [highlightDraft, setHighlightDraft] = useState<HighlightDraft>({
        title: '',
        coverSource: '',
        visibility: 'public',
    });

    useEffect(() => {
        if (!user) {
            router.replace('/login');
            return;
        }
        if (!userProfile) {
            router.replace('/setup-profile');
            return;
        }

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

    useEffect(() => {
        if (!branchOptions.includes(formData.branch)) {
            setFormData((prev) => ({ ...prev, branch: branchOptions[0] }));
        }
    }, [branchOptions, formData.branch]);

    useEffect(() => {
        if (!user || !userProfile) return;

        const activeStories = userProfile.stories.filter((story) => story.expiresAt > Date.now());
        if (activeStories.length === userProfile.stories.length) return;

        const syncStories = async () => {
            try {
                await updateDoc(doc(db, 'users', user.uid), { stories: activeStories });
                setUserProfile({ ...userProfile, stories: activeStories });
            } catch {
                // Skip toast here to avoid noisy background errors during interval checks.
            }
        };

        void syncStories();
    }, [currentTime, user, userProfile, setUserProfile]);

    const applyProfileUpdates = async (updates: Partial<UserProfile>, successMessage?: string) => {
        if (!user || !userProfile) return false;

        await updateDoc(doc(db, 'users', user.uid), updates);
        setUserProfile({ ...userProfile, ...updates });
        if (successMessage) {
            toast.success(successMessage);
        }
        return true;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile) return;

        const cleanName = formData.name.trim();
        const cleanBranch = formData.branch.trim();
        const cleanImage = formData.profileImage.trim();

        if (!cleanName) {
            toast.error('Please enter your full name.');
            return;
        }

        setSaving(true);
        try {
            const profileUpdates = {
                name: cleanName,
                field: formData.field,
                year: formData.year,
                division: formData.division,
                branch: cleanBranch,
                gender: formData.gender,
                accountVisibility: formData.accountVisibility,
                profileImage: resolveProfileImage(cleanImage, userProfile.email, cleanName),
            };

            await applyProfileUpdates(profileUpdates, 'Profile updated successfully.');
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('Permission denied by Firestore Rules for profile update.');
            } else if (error instanceof Error) {
                toast.error(error.message || 'Failed to update profile.');
            } else {
                toast.error('Failed to update profile.');
            }
        } finally {
            setSaving(false);
        }
    };

    const addGalleryItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const imageUrl = getValidHttpUrl(galleryDraft.imageSource);
        if (!userProfile || !imageUrl) {
            toast.error('Add a valid image URL for the gallery photo.');
            return;
        }

        const item: ProfileGalleryItem = {
            id: createClientId('gallery'),
            imageUrl,
            caption: galleryDraft.caption.trim(),
            visibility: galleryDraft.visibility,
            createdAt: Date.now(),
        };

        try {
            await applyProfileUpdates({ gallery: [item, ...userProfile.gallery] }, 'Gallery updated.');
            setGalleryDraft({ imageSource: '', caption: '', visibility: 'public' });
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('You do not have permission to update gallery.');
            } else {
                toast.error('Failed to add gallery photo.');
            }
        }
    };

    const removeGalleryItem = async (itemId: string) => {
        if (!userProfile) return;
        const nextGallery = userProfile.gallery.filter((item) => item.id !== itemId);

        try {
            await applyProfileUpdates({ gallery: nextGallery }, 'Photo removed from gallery.');
        } catch {
            toast.error('Failed to remove gallery photo.');
        }
    };

    const addStory = async (e: React.FormEvent) => {
        e.preventDefault();
        const imageUrl = getValidHttpUrl(storyDraft.imageSource);
        if (!userProfile || !imageUrl) {
            toast.error('Add a valid image URL for your story.');
            return;
        }

        const createdAt = Date.now();
        const story: ProfileStoryItem = {
            id: createClientId('story'),
            imageUrl,
            visibility: storyDraft.visibility,
            createdAt,
            expiresAt: createdAt + STORY_TTL_MS,
        };

        try {
            await applyProfileUpdates({ stories: [story, ...userProfile.stories] }, 'Story uploaded.');
            setStoryDraft({ imageSource: '', visibility: 'public' });
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('You do not have permission to upload stories.');
            } else {
                toast.error('Failed to upload story.');
            }
        }
    };

    const removeStory = async (storyId: string) => {
        if (!userProfile) return;
        const nextStories = userProfile.stories.filter((story) => story.id !== storyId);

        try {
            await applyProfileUpdates({ stories: nextStories }, 'Story removed.');
        } catch {
            toast.error('Failed to remove story.');
        }
    };

    const addHighlight = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;

        const cleanTitle = highlightDraft.title.trim();
        const cleanCover = getValidHttpUrl(highlightDraft.coverSource);
        if (!cleanTitle || !cleanCover) {
            toast.error('Add a highlight title and a valid image URL.');
            return;
        }

        const highlight: ProfileHighlightItem = {
            id: createClientId('highlight'),
            title: cleanTitle,
            coverImageUrl: cleanCover,
            visibility: highlightDraft.visibility,
            createdAt: Date.now(),
        };

        try {
            await applyProfileUpdates({ highlights: [highlight, ...userProfile.highlights] }, 'Highlight added.');
            setHighlightDraft({ title: '', coverSource: '', visibility: 'public' });
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('You do not have permission to add highlights.');
            } else {
                toast.error('Failed to add highlight.');
            }
        }
    };

    const removeHighlight = async (highlightId: string) => {
        if (!userProfile) return;
        const nextHighlights = userProfile.highlights.filter((highlight) => highlight.id !== highlightId);

        try {
            await applyProfileUpdates({ highlights: nextHighlights }, 'Highlight removed.');
        } catch {
            toast.error('Failed to remove highlight.');
        }
    };

    const activeStories = useMemo(
        () => (userProfile?.stories ?? []).filter((story) => story.expiresAt > currentTime),
        [userProfile?.stories, currentTime]
    );
    const driveConfigured = isGoogleDriveConfigured();
    const driveConnected = !!userProfile?.googleDrive;
    const canUploadToDrive = driveConfigured && driveConnected;

    const uploadImageFileToDrive = async (
        file: File,
        target: 'profile' | 'story' | 'highlight' | 'gallery'
    ): Promise<string | null> => {
        if (!userProfile?.googleDrive) {
            toast.error('Connect Google Drive from Settings first.');
            return null;
        }

        if (!driveConfigured) {
            toast.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local');
            return null;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file.');
            return null;
        }

        setUploadingTarget(target);
        try {
            let accessToken = '';
            try {
                accessToken = await requestGoogleDriveAccessToken('');
            } catch {
                accessToken = await requestGoogleDriveAccessToken('consent');
            }
            const uploadResult = await uploadImageToGoogleDrive({
                accessToken,
                file,
                folderId: userProfile.googleDrive.folderId,
            });
            toast.success('Image uploaded to your Google Drive.');
            return uploadResult.directImageUrl;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Google Drive upload failed.';
            toast.error(message);
            return null;
        } finally {
            setUploadingTarget(null);
        }
    };

    const handleProfilePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const uploadedUrl = await uploadImageFileToDrive(file, 'profile');
        if (!uploadedUrl) return;

        setFormData((prev) => ({
            ...prev,
            profileImage: uploadedUrl,
        }));
    };

    const handleStoryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const uploadedUrl = await uploadImageFileToDrive(file, 'story');
        if (!uploadedUrl) return;

        setStoryDraft((prev) => ({
            ...prev,
            imageSource: uploadedUrl,
        }));
    };

    const handleHighlightFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const uploadedUrl = await uploadImageFileToDrive(file, 'highlight');
        if (!uploadedUrl) return;

        setHighlightDraft((prev) => ({
            ...prev,
            coverSource: uploadedUrl,
        }));
    };

    const handleGalleryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const uploadedUrl = await uploadImageFileToDrive(file, 'gallery');
        if (!uploadedUrl) return;

        setGalleryDraft((prev) => ({
            ...prev,
            imageSource: uploadedUrl,
        }));
    };

    if (!user || !userProfile) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const createdOn = new Date(userProfile.createdAt).toLocaleDateString();
    const resolvedPreviewImage = resolveProfileImage(formData.profileImage, userProfile.email, formData.name || userProfile.name);

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto py-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile</h1>
                <p className="mt-2 text-sm text-gray-600">Manage your DYPU Connect profile details.</p>

                <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <img src={resolvedPreviewImage} alt={formData.name || 'Profile'} className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50 object-cover object-center" />
                        <div>
                            <p className="text-sm text-gray-500">Account email</p>
                            <p className="text-sm font-medium text-gray-900">{userProfile.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Joined on {createdOn}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Account: {visibilityLabel(userProfile.accountVisibility)}
                            </p>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSave}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                id="name"
                                required
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700">Profile Photo URL or Email</label>
                            <input
                                id="profileImage"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.profileImage}
                                onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                                placeholder="https://... or you@dypatil.edu"
                            />
                            <div className="mt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!canUploadToDrive || !!uploadingTarget}
                                    onClick={() => profilePhotoFileInputRef.current?.click()}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {uploadingTarget === 'profile' ? 'Uploading...' : 'Upload Image to Drive'}
                                </button>
                                {!driveConnected && (
                                    <p className="text-xs text-gray-500">Connect Google Drive in Settings to upload files.</p>
                                )}
                            </div>
                            <input
                                ref={profilePhotoFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfilePhotoFileChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="field" className="block text-sm font-medium text-gray-700">Field</label>
                                <select
                                    id="field"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.field}
                                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                                >
                                    {PROFILE_FIELDS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Branch</label>
                                <select
                                    id="branch"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                >
                                    {branchOptions.map((branch) => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                                <select
                                    id="year"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                >
                                    {PROFILE_YEARS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="division" className="block text-sm font-medium text-gray-700">Division</label>
                                <select
                                    id="division"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.division}
                                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                >
                                    {PROFILE_DIVISIONS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                                <select
                                    id="gender"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as ProfileFormData['gender'] })}
                                >
                                    {PROFILE_GENDERS.map((item) => (
                                        <option key={item} value={item}>
                                            {item.charAt(0).toUpperCase() + item.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="accountVisibility" className="block text-sm font-medium text-gray-700">Account Type</label>
                                <select
                                    id="accountVisibility"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.accountVisibility}
                                    onChange={(e) => setFormData({ ...formData, accountVisibility: e.target.value as ProfileFormData['accountVisibility'] })}
                                >
                                    {PROFILE_VISIBILITY_OPTIONS.map((item) => (
                                        <option key={item} value={item}>
                                            {visibilityLabel(item)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900">Stories</h2>
                    <p className="text-sm text-gray-600 mt-1">Stories auto-expire in 24 hours. Add as public or private.</p>

                    <form className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_170px_auto_auto] gap-3" onSubmit={addStory}>
                        <input
                            value={storyDraft.imageSource}
                            onChange={(e) => setStoryDraft((prev) => ({ ...prev, imageSource: e.target.value }))}
                            placeholder="https://your-story-image-url"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <select
                            value={storyDraft.visibility}
                            onChange={(e) => setStoryDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {PROFILE_VISIBILITY_OPTIONS.map((item) => (
                                <option key={item} value={item}>{visibilityLabel(item)}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                            Upload Story
                        </button>
                        <button
                            type="button"
                            disabled={!canUploadToDrive || !!uploadingTarget}
                            onClick={() => storyFileInputRef.current?.click()}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {uploadingTarget === 'story' ? 'Uploading...' : 'Pick File'}
                        </button>
                        <input
                            ref={storyFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleStoryFileChange}
                        />
                    </form>

                    <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
                        {activeStories.length === 0 && (
                            <p className="text-sm text-gray-500">No active stories yet.</p>
                        )}
                        {activeStories.map((story) => (
                            <div key={story.id} className="min-w-[120px] max-w-[120px]">
                                <img
                                    src={story.imageUrl}
                                    alt="Story"
                                    className="h-32 w-full rounded-lg border border-gray-200 object-cover object-center bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Expires in {formatDistanceToNowStrict(new Date(story.expiresAt))}
                                </p>
                                <p className="text-xs text-gray-500">{visibilityLabel(story.visibility)}</p>
                                <button
                                    onClick={() => removeStory(story.id)}
                                    className="mt-1 text-xs font-medium text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900">Highlights</h2>
                    <p className="text-sm text-gray-600 mt-1">Save key moments permanently like Instagram highlights.</p>

                    <form className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={addHighlight}>
                        <input
                            value={highlightDraft.title}
                            onChange={(e) => setHighlightDraft((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Highlight title"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                            value={highlightDraft.coverSource}
                            onChange={(e) => setHighlightDraft((prev) => ({ ...prev, coverSource: e.target.value }))}
                            placeholder="https://your-highlight-cover-url"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <select
                            value={highlightDraft.visibility}
                            onChange={(e) => setHighlightDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {PROFILE_VISIBILITY_OPTIONS.map((item) => (
                                <option key={item} value={item}>{visibilityLabel(item)}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                            Add Highlight
                        </button>
                        <button
                            type="button"
                            disabled={!canUploadToDrive || !!uploadingTarget}
                            onClick={() => highlightFileInputRef.current?.click()}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {uploadingTarget === 'highlight' ? 'Uploading...' : 'Pick File'}
                        </button>
                        <input
                            ref={highlightFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleHighlightFileChange}
                        />
                    </form>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {userProfile.highlights.length === 0 && (
                            <p className="text-sm text-gray-500 col-span-full">No highlights yet.</p>
                        )}
                        {userProfile.highlights.map((highlight) => (
                            <div key={highlight.id} className="rounded-lg border border-gray-200 p-2">
                                <img
                                    src={highlight.coverImageUrl}
                                    alt={highlight.title}
                                    className="h-24 w-full rounded-md object-cover object-center bg-gray-100"
                                />
                                <p className="text-sm font-medium text-gray-900 mt-2 truncate">{highlight.title}</p>
                                <p className="text-xs text-gray-500">{visibilityLabel(highlight.visibility)}</p>
                                <button
                                    onClick={() => removeHighlight(highlight.id)}
                                    className="mt-1 text-xs font-medium text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900">Photo Gallery</h2>
                    <p className="text-sm text-gray-600 mt-1">Maintain multiple profile photos with public/private visibility.</p>

                    <form className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={addGalleryItem}>
                        <input
                            value={galleryDraft.imageSource}
                            onChange={(e) => setGalleryDraft((prev) => ({ ...prev, imageSource: e.target.value }))}
                            placeholder="https://your-gallery-photo-url"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                            value={galleryDraft.caption}
                            onChange={(e) => setGalleryDraft((prev) => ({ ...prev, caption: e.target.value }))}
                            placeholder="Caption (optional)"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <select
                            value={galleryDraft.visibility}
                            onChange={(e) => setGalleryDraft((prev) => ({ ...prev, visibility: e.target.value as ProfileVisibility }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {PROFILE_VISIBILITY_OPTIONS.map((item) => (
                                <option key={item} value={item}>{visibilityLabel(item)}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                            Add Photo
                        </button>
                        <button
                            type="button"
                            disabled={!canUploadToDrive || !!uploadingTarget}
                            onClick={() => galleryFileInputRef.current?.click()}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {uploadingTarget === 'gallery' ? 'Uploading...' : 'Pick File'}
                        </button>
                        <input
                            ref={galleryFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleGalleryFileChange}
                        />
                    </form>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {userProfile.gallery.length === 0 && (
                            <p className="text-sm text-gray-500 col-span-full">No gallery photos yet.</p>
                        )}
                        {userProfile.gallery.map((item) => (
                            <div key={item.id} className="rounded-lg border border-gray-200 p-2">
                                <img
                                    src={item.imageUrl}
                                    alt={item.caption || 'Gallery photo'}
                                    className="h-28 w-full rounded-md object-cover object-center bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-2">{visibilityLabel(item.visibility)}</p>
                                {item.caption && <p className="text-sm text-gray-800 truncate">{item.caption}</p>}
                                <button
                                    onClick={() => removeGalleryItem(item.id)}
                                    className="mt-1 text-xs font-medium text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
