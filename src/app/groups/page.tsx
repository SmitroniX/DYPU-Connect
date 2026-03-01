'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { BookOpen, GraduationCap, Building, Hash, ArrowRight } from 'lucide-react';

export default function GroupsPage() {
    const { userProfile } = useStore();

    if (!userProfile) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
                    <div className="flex gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--dc-accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--dc-accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--dc-accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const groups = [
        {
            id: `field_${userProfile.field.replace(/\s+/g, '_')}`,
            name: userProfile.field,
            type: 'Field Level',
            description: `Discussions for all ${userProfile.field} students`,
            icon: BookOpen,
        },
        {
            id: `year_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}`,
            name: `${userProfile.field} - ${userProfile.year}`,
            type: 'Year Level',
            description: `Discussions for ${userProfile.year} ${userProfile.field} students`,
            icon: GraduationCap,
        },
        {
            id: `division_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}_${userProfile.division}`,
            name: `${userProfile.year} Div ${userProfile.division}`,
            type: 'Division Level',
            description: `Your primary class group (Division ${userProfile.division})`,
            icon: Building,
        }
    ];

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name="groups" description="Your auto-assigned campus groups" />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full animate-[fade-in-up_0.3s_ease-out]">
                    <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--dc-text-muted)] mb-2 px-1">
                            Your Groups
                        </h3>
                    </div>

                    <div className="space-y-1">
                        {groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="dc-card-interactive flex items-center gap-3 px-3 py-3 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[var(--dc-accent-dim)] flex items-center justify-center shrink-0">
                                    <group.icon className="w-5 h-5 text-[var(--dc-accent)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-[var(--dc-text-muted)] shrink-0" />
                                        <p className="text-[15px] font-medium text-[var(--dc-text-secondary)] group-hover:text-[var(--dc-text-primary)] truncate transition-colors">
                                            {group.name}
                                        </p>
                                    </div>
                                    <p className="text-xs text-[var(--dc-text-muted)] truncate ml-6">{group.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-medium text-[var(--dc-text-muted)] bg-[var(--dc-bg-tertiary)] px-2 py-0.5 rounded-full">
                                        {group.type}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-[var(--dc-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
