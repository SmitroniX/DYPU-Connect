'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useStore } from '../../store/useStore';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import type { FirebaseError } from 'firebase/app';
import type { ProfileFormData, UserProfile } from '@/types/profile';
import {
    getProfileBranchOptions,
    PROFILE_DIVISIONS,
    PROFILE_FIELDS,
    PROFILE_GENDERS,
    PROFILE_VISIBILITY_OPTIONS,
    PROFILE_YEARS,
} from '@/types/profile';
import { resolveProfileImage } from '@/lib/profileImage';
import { isAutoAdminEmail } from '@/lib/admin';

export default function SetupProfilePage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ProfileFormData & { profilePhotoSource: string }>({
        name: user?.displayName || '',
        field: 'Engineering',
        year: 'First Year',
        division: 'A',
        branch: 'Computer Engineering',
        gender: 'other',
        accountVisibility: 'public',
        profilePhotoSource: user?.photoURL || user?.email || '',
    });

    useEffect(() => {
        if (!user) {
            router.replace('/login');
        } else if (userProfile) {
            router.replace('/');
        }
    }, [user, userProfile, router]);

    useEffect(() => {
        if (user?.displayName && !formData.name) {
            setFormData((prev) => ({ ...prev, name: user.displayName || '' }));
        }
    }, [formData.name, user?.displayName]);

    const branchOptions = getProfileBranchOptions(formData.field);

    useEffect(() => {
        if (!branchOptions.includes(formData.branch)) {
            setFormData((prev) => ({ ...prev, branch: branchOptions[0] }));
        }
    }, [branchOptions, formData.branch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.name.trim()) {
            toast.error('Please enter your full name.');
            return;
        }

        setLoading(true);
        try {
            const cleanName = formData.name.trim();
            const profileImage = resolveProfileImage(
                formData.profilePhotoSource || user.photoURL || user.email || '',
                user.email,
                cleanName
            );

            const newProfile: UserProfile = {
                userId: user.uid,
                name: cleanName,
                email: user.email as string,
                profileImage,
                field: formData.field,
                year: formData.year,
                division: formData.division,
                branch: formData.branch.trim(),
                gender: formData.gender,
                accountVisibility: formData.accountVisibility,
                gallery: [],
                stories: [],
                highlights: [],
                role: isAutoAdminEmail(user.email) ? 'admin' : 'user',
                status: 'active' as const,
                createdAt: Date.now()
            };

            // Create user profile document
            await setDoc(doc(db, 'users', user.uid), newProfile);

            // Auto-assign to groups: Field, Field-Year, Field-Year-Division
            // (The actual group creation logic can be done via Firebase Cloud Functions or client-side.
            //  Here we'll have a simplified client-side tracking or just query-based groups).
            // We will handle specific Group Document population later.

            setUserProfile(newProfile);
            toast.success('Profile setup complete!');
            router.push('/');
        } catch (error: unknown) {
            const firebaseError = error as FirebaseError | undefined;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('Permission denied by Firestore Rules. Allow signed-in users to write their own profile at users/{uid}.');
            } else if (error instanceof Error) {
                toast.error(error.message || 'Failed to create profile');
            } else {
                toast.error('Failed to create profile');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user || userProfile) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">Complete Your Profile</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">Setup your DYPU Connect identity</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                            <img
                                src={resolveProfileImage(formData.profilePhotoSource, user.email, formData.name || 'DYPU User')}
                                alt="Profile preview"
                                className="h-12 w-12 rounded-full border border-gray-200 bg-white object-cover object-center"
                            />
                            <div className="flex-1 min-w-0">
                                <label htmlFor="profilePhotoSource" className="block text-sm font-medium text-gray-700">
                                    Profile Photo URL or Email
                                </label>
                                <input
                                    id="profilePhotoSource"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="https://... or you@dypatil.edu"
                                    value={formData.profilePhotoSource}
                                    onChange={(e) => setFormData({ ...formData, profilePhotoSource: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                id="name"
                                required
                                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="field" className="block text-sm font-medium text-gray-700">Field of Study</label>
                            <select
                                id="field"
                                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.field}
                                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                            >
                                {PROFILE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Branch Specialization</label>
                            <select
                                id="branch"
                                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                            >
                                {branchOptions.map((branch) => (
                                    <option key={branch} value={branch}>{branch}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                                <select
                                    id="year"
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                >
                                    {PROFILE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="w-1/3">
                                <label htmlFor="division" className="block text-sm font-medium text-gray-700">Division</label>
                                <select
                                    id="division"
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={formData.division}
                                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                >
                                    {PROFILE_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                                <select
                                    id="gender"
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as ProfileFormData['gender'] })}
                                >
                                    {PROFILE_GENDERS.map((gender) => (
                                        <option key={gender} value={gender}>
                                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="accountVisibility" className="block text-sm font-medium text-gray-700">Account Type</label>
                                <select
                                    id="accountVisibility"
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={formData.accountVisibility}
                                    onChange={(e) => setFormData({ ...formData, accountVisibility: e.target.value as ProfileFormData['accountVisibility'] })}
                                >
                                    {PROFILE_VISIBILITY_OPTIONS.map((visibility) => (
                                        <option key={visibility} value={visibility}>
                                            {visibility === 'public' ? 'Public' : 'Private'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {loading ? 'Saving...' : 'Complete Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
