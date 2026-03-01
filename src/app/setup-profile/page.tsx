'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import {
    Camera,
    ChevronRight,
    Globe,
    GraduationCap,
    Lock,
    Sparkles,
    User,
} from 'lucide-react';

export default function SetupProfilePage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile, driveAccessToken } = useStore();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
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
                // Auto-connect Google Drive if user signed in via Google
                ...(user.providerData.some(p => p.providerId === 'google.com') && driveAccessToken
                    ? {
                        googleDrive: {
                            email: user.email as string,
                            connectedAt: Date.now(),
                        },
                    }
                    : {}),
                role: isAutoAdminEmail(user.email) ? 'admin' : 'user',
                status: 'active' as const,
                createdAt: Date.now()
            };

            // Create user profile document
            await setDoc(doc(db, 'users', user.uid), newProfile);

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

    const resolvedImage = resolveProfileImage(formData.profilePhotoSource, user.email, formData.name || 'DYPU User');
    const totalSteps = 3;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--dc-bg-tertiary)] py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-sky-300/8 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-slate-300/8 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-200/5 blur-3xl" />
            </div>

            <div className="relative max-w-lg w-full space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-linear-to-br from-sky-300 to-slate-400 shadow-lg shadow-sky-300/15 mx-auto">
                        <Sparkles className="h-7 w-7 text-slate-900" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        Complete Your Profile
                    </h1>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                        Set up your DYPU Connect identity to get started with your campus community
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`h-2 rounded-full transition-all duration-300 ${
                                i + 1 <= step ? 'w-10 bg-linear-to-r from-sky-300 to-slate-300' : 'w-6 bg-white/10'
                            }`} />
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="glass p-6 sm:p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {/* Step 1: Identity */}
                        {step === 1 && (
                            <div className="space-y-5 animate-[fade-in-up_0.3s_ease-out]">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-300/15 ring-1 ring-sky-300/20">
                                        <User className="h-4.5 w-4.5 text-sky-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Your Identity</h2>
                                        <p className="text-xs text-slate-400">How others will see you</p>
                                    </div>
                                </div>

                                {/* Profile Photo */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="relative">
                                        <img
                                            src={resolvedImage}
                                            alt="Profile preview"
                                            className="h-16 w-16 rounded-2xl border-2 border-white/10 bg-white/5 object-cover object-center shadow-lg"
                                        />
                                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-sky-400 flex items-center justify-center">
                                            <Camera className="h-3 w-3 text-slate-900" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label htmlFor="profilePhotoSource" className="block text-xs font-medium text-slate-400 mb-1.5">
                                            Profile Photo URL or Email
                                        </label>
                                        <input
                                            id="profilePhotoSource"
                                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all"
                                            placeholder="https://... or you@dypatil.edu"
                                            value={formData.profilePhotoSource}
                                            onChange={(e) => setFormData({ ...formData, profilePhotoSource: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label htmlFor="name" className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                                    <input
                                        id="name"
                                        required
                                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">Gender</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PROFILE_GENDERS.map((gender) => (
                                            <button
                                                key={gender}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, gender })}
                                                className={`rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                                                    formData.gender === gender
                                                        ? 'bg-linear-to-r from-sky-300/80 to-slate-300/80 text-slate-900 shadow-lg shadow-sky-300/15 ring-1 ring-sky-300/30'
                                                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!formData.name.trim()) { toast.error('Please enter your name.'); return; }
                                        setStep(2);
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-200 to-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-300/15 hover:from-sky-100 hover:to-slate-200 transition-all duration-200"
                                >
                                    Continue <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Step 2: Academics */}
                        {step === 2 && (
                            <div className="space-y-5 animate-[fade-in-up_0.3s_ease-out]">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-300/15 ring-1 ring-sky-300/20">
                                        <GraduationCap className="h-4.5 w-4.5 text-sky-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Academics</h2>
                                        <p className="text-xs text-slate-400">Your course and division details</p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="field" className="block text-xs font-medium text-slate-400 mb-1.5">Field of Study</label>
                                    <select
                                        id="field"
                                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all appearance-none"
                                        value={formData.field}
                                        onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                                    >
                                        {PROFILE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="branch" className="block text-xs font-medium text-slate-400 mb-1.5">Branch / Specialization</label>
                                    <select
                                        id="branch"
                                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all appearance-none"
                                        value={formData.branch}
                                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    >
                                        {branchOptions.map((branch) => (
                                            <option key={branch} value={branch}>{branch}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="year" className="block text-xs font-medium text-slate-400 mb-1.5">Year</label>
                                        <select
                                            id="year"
                                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all appearance-none"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        >
                                            {PROFILE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="division" className="block text-xs font-medium text-slate-400 mb-1.5">Division</label>
                                        <select
                                            id="division"
                                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all appearance-none"
                                            value={formData.division}
                                            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                        >
                                            {PROFILE_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 transition-all duration-200"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="flex-2 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-200 to-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-300/15 hover:from-sky-100 hover:to-slate-200 transition-all duration-200"
                                    >
                                        Continue <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Preferences & Confirm */}
                        {step === 3 && (
                            <div className="space-y-5 animate-[fade-in-up_0.3s_ease-out]">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-300/15 ring-1 ring-sky-300/20">
                                        <Globe className="h-4.5 w-4.5 text-sky-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Privacy & Review</h2>
                                        <p className="text-xs text-slate-400">Choose your visibility and confirm</p>
                                    </div>
                                </div>

                                {/* Visibility Selection */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">Account Visibility</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {PROFILE_VISIBILITY_OPTIONS.map((visibility) => (
                                            <button
                                                key={visibility}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, accountVisibility: visibility })}
                                                className={`flex items-center gap-3 rounded-xl p-4 transition-all duration-200 ${
                                                    formData.accountVisibility === visibility
                                                        ? 'bg-linear-to-r from-sky-300/15 to-slate-300/10 ring-2 ring-sky-300/30'
                                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                {visibility === 'public'
                                                    ? <Globe className="h-5 w-5 text-sky-300" />
                                                    : <Lock className="h-5 w-5 text-slate-400" />
                                                }
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-white">{visibility === 'public' ? 'Public' : 'Private'}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {visibility === 'public' ? 'Visible to everyone' : 'Only visible to you'}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Profile Preview Card */}
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview</p>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={resolvedImage}
                                            alt="Preview"
                                            className="h-12 w-12 rounded-xl object-cover object-center ring-2 ring-white/10"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{formData.name || 'Your Name'}</p>
                                            <p className="text-xs text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                                            {formData.field}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                                            {formData.branch}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                                            {formData.year}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                                            Div {formData.division}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 transition-all duration-200"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-2 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-200 to-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-300/15 hover:from-sky-100 hover:to-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        {loading ? 'Creating Profile...' : 'Complete Setup'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer text */}
                <p className="text-center text-[11px] text-slate-600">
                    DYPU Connect · Your campus, connected
                </p>
            </div>
        </div>
    );
}
