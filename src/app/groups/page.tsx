'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { Users, BookOpen, GraduationCap, Building } from 'lucide-react';

export default function GroupsPage() {
    const { userProfile } = useStore();

    if (!userProfile) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
                    <div className="flex gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
            color: 'bg-blue-500/15 text-blue-400',
            borderHover: 'hover:border-blue-500/30',
        },
        {
            id: `year_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}`,
            name: `${userProfile.field} - ${userProfile.year}`,
            type: 'Year Level',
            description: `Discussions for ${userProfile.year} ${userProfile.field} students`,
            icon: GraduationCap,
            color: 'bg-emerald-500/15 text-emerald-400',
            borderHover: 'hover:border-emerald-500/30',
        },
        {
            id: `division_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}_${userProfile.division}`,
            name: `${userProfile.year} Div ${userProfile.division}`,
            type: 'Division Level',
            description: `Your primary class group (Division ${userProfile.division})`,
            icon: Building,
            color: 'bg-violet-500/15 text-violet-400',
            borderHover: 'hover:border-violet-500/30',
        }
    ];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-4 font-sans animate-[fade-in-up_0.5s_ease-out]">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                        🎓 My Groups
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        You are automatically assigned to these groups based on your profile.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groups.map((group) => (
                        <Link
                            key={group.id}
                            href={`/groups/${group.id}`}
                            className={`group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 ${group.borderHover} hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer`}
                        >
                            <div className="p-6 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${group.color} group-hover:scale-110 transition-transform duration-200`}>
                                    <group.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 leading-tight">{group.name}</h3>
                                <span className="inline-block px-2 py-1 bg-white/10 text-slate-300 text-[10px] font-semibold rounded uppercase tracking-wider mb-3">
                                    {group.type}
                                </span>
                                <p className="text-sm text-slate-400 line-clamp-2">
                                    {group.description}
                                </p>
                            </div>
                            <div className="bg-white/5 p-4 border-t border-white/10 text-sm font-medium text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between transition-colors">
                                <span>Enter Chat</span>
                                <Users className="w-4 h-4" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
