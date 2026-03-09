'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import type { FirebaseError } from 'firebase/app';
import {
    ArrowLeft, Camera, Github, Globe, HardDriveUpload, Instagram, Linkedin,
    Lock, Mail, Save, ShieldCheck, User, Upload, ChevronRight, X
} from 'lucide-react';

import {
    requestGoogleDriveAccessToken,
    uploadImageToGoogleDrive,
    loadGoogleIdentityScript,
    isGoogleDriveConfigured,
} from '@/lib/googleDrive';
import { resolveProfileImage } from '@/lib/profileImage';
import { logActivity } from '@/lib/activityLog';
import { exportProfileBackup, listBackups, importProfileBackup } from '@/lib/backup';
import type { GoogleDriveListFile } from '@/lib/googleDrive';
import type { ProfileFormData, UserProfile } from '@/types/profile';
import {
    getProfileBranchOptions,
    PROFILE_DIVISIONS,
    PROFILE_FIELDS,
    PROFILE_GENDERS,
    PROFILE_VISIBILITY_OPTIONS,
    PROFILE_YEARS,
} from '@/types/profile';

interface EditableProfileData extends ProfileFormData {
    profileImage: string;
}

type TabKey = 'personal' | 'social' | 'academic' | 'privacy' | 'backup';

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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    ▼
                </div>
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

export default function AccountsCenterPage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile, driveAccessToken, setDriveAccessToken } = useStore();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabKey>('personal');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true); // On mobile, show menu first
    const profilePhotoFileInputRef = useRef<HTMLInputElement>(null);

    const [initialData, setInitialData] = useState<EditableProfileData | null>(null);
    const [formData, setFormData] = useState<EditableProfileData | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingTarget, setUploadingTarget] = useState<'profile' | null>(null);

    const [backupBusy, setBackupBusy] = useState(false);
    const [backupFiles, setBackupFiles] = useState<GoogleDriveListFile[]>([]);
    const [showBackups, setShowBackups] = useState(false);

    useEffect(() => {
        if (!user) { router.replace('/login'); return; }
        if (!userProfile) { router.replace('/setup-profile'); return; }
        
        if (isGoogleDriveConfigured()) {
            loadGoogleIdentityScript().catch(() => {});
        }

        if (!initialData) {
            const data: EditableProfileData = {
                name: userProfile.name,
                bio: userProfile.bio ?? '',
                socialLinks: {
                    instagram: userProfile.socialLinks?.instagram ?? '',
                    linkedin: userProfile.socialLinks?.linkedin ?? '',
                    github: userProfile.socialLinks?.github ?? ''
                },
                field: userProfile.field,
                year: userProfile.year,
                division: userProfile.division,
                branch: userProfile.branch ?? '',
                gender: userProfile.gender,
                accountVisibility: userProfile.accountVisibility,
                profileImage: userProfile.profileImage,
            };
            setInitialData(data);
            setFormData(data);
        }
    }, [user, userProfile, router, initialData]);

    // Handle cascading dropdowns
    const branchOptions = useMemo(() => formData ? getProfileBranchOptions(formData.field) : [], [formData?.field]);
    useEffect(() => {
        if (formData && !branchOptions.includes(formData.branch)) {
            setFormData(prev => prev ? { ...prev, branch: branchOptions[0] || '' } : null);
        }
    }, [branchOptions, formData?.branch]);

    if (!user || !userProfile || !formData || !initialData) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
            </DashboardLayout>
        );
    }

    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(initialData) !== JSON.stringify(formData);

    const handleDiscard = () => {
        setFormData(initialData);
        toast('Changes discarded', { icon: '✖️' });
    };

    const handleSave = async () => {
        const cleanName = formData.name.trim();
        if (!cleanName) { toast.error('Full name is required.'); return; }
        
        setSaving(true);
        try {
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

            await updateDoc(doc(db, 'users', user.uid), profileUpdates);
            const freshProfile = useStore.getState().userProfile;
            setUserProfile({ ...freshProfile!, ...profileUpdates });
            
            // Update initial data so save bar vanishes
            setInitialData({ ...formData, profileImage: profileUpdates.profileImage, name: profileUpdates.name, bio: profileUpdates.bio });
            
            toast.success('Profile saved successfully.');
            logActivity(user.uid, 'profile_update', `Updated profile via Accounts Center`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleProfilePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!isGoogleDriveConfigured()) {
            toast.error('Google Drive is not configured by the admin.');
            return;
        }
        const file = event.target.files?.[0]; 
        event.target.value = ''; 
        if (!file) return;

        setUploadingTarget('profile');
        try {
            let accessToken = driveAccessToken;
            if (!accessToken) {
                try { accessToken = await requestGoogleDriveAccessToken(''); }
                catch { accessToken = await requestGoogleDriveAccessToken('consent'); }
                setDriveAccessToken(accessToken);
            }
            const uploadResult = await uploadImageToGoogleDrive({ accessToken, file, folderId: userProfile?.googleDrive?.folderId });
            setFormData(prev => prev ? { ...prev, profileImage: uploadResult.directImageUrl } : null);
            toast.success('Photo uploaded instantly!');
        } catch (error) {
            setDriveAccessToken(null);
            toast.error('Failed to upload photo.');
        } finally {
            setUploadingTarget(null);
        }
    };

    const TABS = [
        { id: 'personal', label: 'Personal Details', icon: User, desc: 'Name, bio, and photo' },
        { id: 'academic', label: 'Academic Info', icon: GraduationCapIcon, desc: 'Year, field, and branch' },
        { id: 'social', label: 'Social Links', icon: Globe, desc: 'Connect your other accounts' },
        { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck, desc: 'Visibility and gender' },
        { id: 'backup', label: 'Data & Backup', icon: HardDriveUpload, desc: 'Export or restore profile' }
    ] as const;

    // A hacky graduation cap icon for inline use since we didn't import one 
    function GraduationCapIcon(props: any) {
        return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a2 2 0 0 1-.019 3.138l-4.223 3.42A2 2 0 0 1 15.3 18l-8.6-4.6"/><path d="M22 10 12 3 2 10l10 7 10-7v5"/><path d="M6 12.2V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5.8"/></svg>;
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto py-4 px-2 sm:px-6 h-[calc(100vh-5rem)] flex flex-col relative">
                
                {/* Header Navbar */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-zinc-800/80">
                    <button 
                        onClick={() => router.push('/profile')}
                        className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800"
                    >
                        <ArrowLeft className="h-5 w-5 text-zinc-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Accounts Center</h1>
                        <p className="text-xs text-zinc-400">Manage your connected experiences and profile settings</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 shadow-2xl backdrop-blur-xl pb-16 lg:pb-0">
                    
                    {/* Sidebar Navigation */}
                    <div className={`
                        w-full lg:w-80 flex-shrink-0 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col overflow-y-auto custom-scrollbar
                        transition-transform duration-300
                        ${!isMobileMenuOpen ? 'hidden lg:flex' : 'flex'}
                    `}>
                        <div className="p-4">
                            <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 px-2">Account Settings</h2>
                            <div className="space-y-1">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                                        className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all ${
                                            activeTab === tab.id 
                                                ? 'bg-blue-500/10 border-blue-500/20 border shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                                : 'hover:bg-zinc-900 border border-transparent'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800/50 text-zinc-400'}`}>
                                            <tab.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-sm ${activeTab === tab.id ? 'text-white' : 'text-zinc-300'}`}>{tab.label}</p>
                                            <p className="text-xs text-zinc-500">{tab.desc}</p>
                                        </div>
                                        <ChevronRight className={`h-4 w-4 ${activeTab === tab.id ? 'text-blue-400 opacity-100' : 'text-zinc-600 opacity-50'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Dynamic Content */}
                    <div className={`
                        flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-zinc-950/20 relative
                        ${isMobileMenuOpen ? 'hidden lg:flex' : 'flex'}
                    `}>
                        {/* Mobile Header to go back to menu */}
                        <div className="lg:hidden sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 p-4 flex items-center gap-3">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 rounded-md bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-400">
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <span className="font-bold text-white">{TABS.find(t => t.id === activeTab)?.label}</span>
                        </div>

                        <div className="p-6 lg:p-10 max-w-2xl w-full mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            
                            {/* --------- PERSONAL TAB --------- */}
                            {activeTab === 'personal' && (
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img 
                                                src={resolveProfileImage(formData.profileImage, userProfile.email, formData.name)} 
                                                alt="Profile" 
                                                className="w-24 h-24 rounded-full object-cover ring-2 ring-zinc-800"
                                            />
                                            <button 
                                                onClick={() => profilePhotoFileInputRef.current?.click()}
                                                disabled={!!uploadingTarget}
                                                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full ring-4 ring-zinc-950 transition-colors"
                                            >
                                                <Camera className="h-4 w-4" />
                                            </button>
                                            <input ref={profilePhotoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoFileChange} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white">Profile Photo</h3>
                                            <p className="text-sm text-zinc-400">Upload a square image for best results.</p>
                                            {uploadingTarget === 'profile' && <p className="text-xs text-blue-400 mt-1 animate-pulse">Uploading directly to Drive...</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <InputField
                                            label="Full Name"
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                        <div>
                                            <label htmlFor="bio" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Bio / About Me</label>
                                            <textarea
                                                id="bio"
                                                rows={4}
                                                maxLength={250}
                                                className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none placeholder:text-zinc-600"
                                                placeholder="Write something about yourself..."
                                                value={formData.bio}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            />
                                            <p className="text-right text-[10px] text-zinc-500 mt-1">{formData.bio.length} / 250</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* --------- ACADEMIC TAB --------- */}
                            {activeTab === 'academic' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SelectField label="Field of Study" id="field" value={formData.field} onChange={(e) => setFormData({ ...formData, field: e.target.value })}>
                                            {PROFILE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                                        </SelectField>
                                        <SelectField label="Branch / Specialization" id="branch" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}>
                                            {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                                        </SelectField>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SelectField label="Academic Year" id="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                                            {PROFILE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                        </SelectField>
                                        <SelectField label="Division / Section" id="division" value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })}>
                                            {PROFILE_DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </SelectField>
                                    </div>
                                </div>
                            )}

                            {/* --------- SOCIAL LINKS TAB --------- */}
                            {activeTab === 'social' && (
                                <div className="space-y-6">
                                    <div className="group flex flex-col md:flex-row gap-4 items-center">
                                        <div className="w-full md:w-32 flex items-center gap-2 text-zinc-400">
                                            <Instagram className="h-5 w-5 text-pink-500" />
                                            <span className="text-sm font-medium">Instagram</span>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <input
                                                className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-pink-500/50 transition-all"
                                                placeholder="@username"
                                                value={formData.socialLinks.instagram}
                                                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                    <div className="group flex flex-col md:flex-row gap-4 items-center">
                                        <div className="w-full md:w-32 flex items-center gap-2 text-zinc-400">
                                            <Linkedin className="h-5 w-5 text-blue-500" />
                                            <span className="text-sm font-medium">LinkedIn</span>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <input
                                                className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="in/username"
                                                value={formData.socialLinks.linkedin}
                                                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                    <div className="group flex flex-col md:flex-row gap-4 items-center">
                                        <div className="w-full md:w-32 flex items-center gap-2 text-zinc-400">
                                            <Github className="h-5 w-5 text-zinc-300" />
                                            <span className="text-sm font-medium">GitHub</span>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <input
                                                className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/80 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500/50 transition-all"
                                                placeholder="github.com/username"
                                                value={formData.socialLinks.github}
                                                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, github: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --------- PRIVACY TAB --------- */}
                            {activeTab === 'privacy' && (
                                <div className="space-y-6">
                                    <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50">
                                        <SelectField label="Account Visibility" id="accountVisibility" value={formData.accountVisibility} onChange={(e) => setFormData({ ...formData, accountVisibility: e.target.value as ProfileFormData['accountVisibility'] })}>
                                            {PROFILE_VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{v === 'public' ? 'Public (Visible in directory)' : 'Private (Hidden from directory)'}</option>)}
                                        </SelectField>
                                        <p className="text-xs text-zinc-500 mt-2">Private profiles are hidden from the global university directory search, but your public chats will still show your identity.</p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50">
                                        <SelectField label="Gender Identity" id="gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value as ProfileFormData['gender'] })}>
                                            {PROFILE_GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                                        </SelectField>
                                    </div>
                                </div>
                            )}

                            {/* --------- BACKUP TAB --------- */}
                            {activeTab === 'backup' && (
                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                                <HardDriveUpload className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">Google Drive Backup</h3>
                                                <p className="text-sm text-zinc-400">Securely backup your profile metadata to your own Google Drive.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-3">
                                            <button 
                                                onClick={async () => {
                                                    setBackupBusy(true);
                                                    try {
                                                        const name = await exportProfileBackup(userProfile, driveAccessToken);
                                                        toast.success(`Exported: ${name}`);
                                                    } catch (err: any) { toast.error(err.message); }
                                                    finally { setBackupBusy(false); }
                                                }}
                                                disabled={backupBusy}
                                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-colors"
                                            >
                                                Export Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sticky Save Bar — Floats above everything when changes exist */}
                <div className={`
                    absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto min-w-[320px] max-w-lg
                    bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl p-4
                    flex items-center justify-between gap-4 z-50
                    transition-all duration-500 ease-out
                    ${hasChanges ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
                `}>
                    <p className="font-bold text-white text-sm hidden sm:block">You have unsaved changes</p>
                    <p className="font-bold text-white text-sm sm:hidden">Unsaved changes</p>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDiscard}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disable:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
