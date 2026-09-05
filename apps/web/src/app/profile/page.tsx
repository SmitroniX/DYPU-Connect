'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import DashboardLayout from '@/components/DashboardLayout';
import { 
    User, Mail, 
    Instagram, Linkedin, Github, Edit3, 
    ShieldCheck, Globe, Lock, Sparkles, Award
} from 'lucide-react';
import { resolveProfileImage } from '@/lib/profileImage';
import LoadingSpinner from '@/components/LoadingSpinner';

/* ── Profile completion calculator ── */
function computeProfileCompletion(profile: any): number {
    let score = 0;
    const total = 10;
    if (profile.name?.trim()) score++;
    if (profile.bio?.trim()) score++;
    if (profile.profileImage && !profile.profileImage.includes('dicebear') && !profile.profileImage.includes('ui-avatars')) score++;
    if (profile.field) score++;
    if (profile.year) score++;
    if (profile.branch) score++;
    if (profile.socialLinks?.instagram || profile.socialLinks?.linkedin || profile.socialLinks?.github) score++;
    if (profile.gallery?.length > 0) score++;
    if (profile.googleDrive) score++;
    if (profile.highlights?.length > 0) score++;
    return Math.round((score / total) * 100);
}

export default function ProfilePage() {
    const { user } = useAuth();
    const { userProfile } = useStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (!user || !userProfile) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center">
                    <LoadingSpinner />
                </div>
            </DashboardLayout>
        );
    }

    const createdOn = new Date(userProfile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const resolvedPreviewImage = resolveProfileImage(userProfile.profileImage, userProfile.email, userProfile.name);
    const profileCompletion = computeProfileCompletion(userProfile);

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 animate-[fade-in-up_0.3s_ease-out]">
                
                {/* Header Card */}
                <div className="glass-panel overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] shadow-xl">
                    <div className="h-32 bg-gradient-to-r from-[var(--ui-accent)]/20 to-[var(--ui-accent-dim)]" />
                    
                    <div className="px-6 pb-6 sm:px-10 relative">
                        {/* Avatar */}
                        <div className="flex justify-between items-end -mt-16 mb-4">
                            <div className="relative h-32 w-32 rounded-full p-1.5 bg-[var(--ui-bg-surface)]">
                                <img
                                    src={resolvedPreviewImage}
                                    alt={userProfile.name}
                                    className="h-full w-full rounded-full object-cover object-center ring-2 ring-[var(--ui-border)]"
                                    onError={(e) => { e.currentTarget.src = resolveProfileImage('', userProfile.email, userProfile.name); }}
                                />
                                {profileCompletion >= 80 && (
                                    <div className="absolute bottom-1 right-1 bg-yellow-500 rounded-full p-1.5 shadow-lg" title="Profile Pro">
                                        <Award className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={() => router.push('/profile/edit')}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--ui-bg-elevated)] hover:bg-[var(--ui-bg-hover)] border border-[var(--ui-border)] rounded-xl text-sm font-semibold transition-colors shadow-sm text-[var(--ui-text)]"
                            >
                                <Edit3 className="h-4 w-4" /> Edit Profile
                            </button>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ui-text)] tracking-tight">
                                    {userProfile.name}
                                </h1>
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userProfile.accountVisibility === 'public' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                                    {userProfile.accountVisibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                    {userProfile.accountVisibility}
                                </span>
                                {userProfile.role === 'admin' && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] font-bold uppercase tracking-wider">
                                        <Sparkles className="h-3 w-3" /> Admin
                                    </span>
                                )}
                            </div>
                            
                            {userProfile.bio && (
                                <p className="text-[var(--ui-text-secondary)] text-sm leading-relaxed max-w-xl mt-2">
                                    {userProfile.bio}
                                </p>
                            )}
                        </div>

                        {/* Social Links */}
                        {(userProfile.socialLinks?.instagram || userProfile.socialLinks?.linkedin || userProfile.socialLinks?.github) && (
                            <div className="flex flex-wrap gap-3 mt-6">
                                {userProfile.socialLinks.instagram && (
                                    <a href={`https://instagram.com/${userProfile.socialLinks.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-400 hover:bg-pink-500 hover:text-white transition-colors">
                                        <Instagram className="h-4 w-4" /> Instagram
                                    </a>
                                )}
                                {userProfile.socialLinks.linkedin && (
                                    <a href={userProfile.socialLinks.linkedin.startsWith('http') ? userProfile.socialLinks.linkedin : `https://linkedin.com/in/${userProfile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors">
                                        <Linkedin className="h-4 w-4" /> LinkedIn
                                    </a>
                                )}
                                {userProfile.socialLinks.github && (
                                    <a href={userProfile.socialLinks.github.startsWith('http') ? userProfile.socialLinks.github : `https://github.com/${userProfile.socialLinks.github}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-text-secondary)] hover:bg-[var(--ui-text)] hover:text-[var(--ui-bg-base)] transition-colors">
                                        <Github className="h-4 w-4" /> GitHub
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-panel p-6 rounded-3xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)] border-b border-[var(--ui-border)] pb-3">Academic Details</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-[var(--ui-text-muted)] mb-1">Field of Study</p>
                                <p className="text-sm font-semibold text-[var(--ui-text)]">{userProfile.field}</p>
                            </div>
                            {userProfile.branch && (
                                <div>
                                    <p className="text-xs text-[var(--ui-text-muted)] mb-1">Branch</p>
                                    <p className="text-sm font-semibold text-[var(--ui-text)]">{userProfile.branch}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-[var(--ui-text-muted)] mb-1">Year</p>
                                    <p className="text-sm font-semibold text-[var(--ui-text)]">{userProfile.year}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--ui-text-muted)] mb-1">Division</p>
                                    <p className="text-sm font-semibold text-[var(--ui-text)]">{userProfile.division}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)] border-b border-[var(--ui-border)] pb-3">Account Info</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[var(--ui-bg-elevated)] rounded-xl border border-[var(--ui-border)]">
                                    <Mail className="h-4 w-4 text-[var(--ui-text-secondary)]" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Email</p>
                                    <p className="text-sm font-medium text-[var(--ui-text)]">{userProfile.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[var(--ui-bg-elevated)] rounded-xl border border-[var(--ui-border)]">
                                    <User className="h-4 w-4 text-[var(--ui-text-secondary)]" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Gender</p>
                                    <p className="text-sm font-medium text-[var(--ui-text)] capitalize">{userProfile.gender}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[var(--ui-bg-elevated)] rounded-xl border border-[var(--ui-border)]">
                                    <ShieldCheck className="h-4 w-4 text-[var(--ui-text-secondary)]" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-[var(--ui-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Member Since</p>
                                    <p className="text-sm font-medium text-[var(--ui-text)]">{createdOn}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
