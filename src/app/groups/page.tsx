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
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    // Deterministically generate group IDs and metadata based on user profile
    const groups = [
        {
            id: `field_${userProfile.field.replace(/\s+/g, '_')}`,
            name: userProfile.field,
            type: 'Field Level',
            description: `Discussions for all ${userProfile.field} students`,
            icon: BookOpen,
            color: 'bg-blue-100 text-blue-600',
        },
        {
            id: `year_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}`,
            name: `${userProfile.field} - ${userProfile.year}`,
            type: 'Year Level',
            description: `Discussions for ${userProfile.year} ${userProfile.field} students`,
            icon: GraduationCap,
            color: 'bg-green-100 text-green-600',
        },
        {
            id: `division_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}_${userProfile.division}`,
            name: `${userProfile.year} Div ${userProfile.division}`,
            type: 'Division Level',
            description: `Your primary class group (Division ${userProfile.division})`,
            icon: Building,
            color: 'bg-purple-100 text-purple-600',
        }
    ];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8 font-sans">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Groups</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        You are automatically assigned to these groups based on your profile.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <Link
                            key={group.id}
                            href={`/groups/${group.id}`}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer relative"
                        >
                            <div className="p-6 flex-1">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${group.color} group-hover:scale-110 transition-transform duration-200`}>
                                    <group.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{group.name}</h3>
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded uppercase tracking-wider mb-3">
                                    {group.type}
                                </span>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                    {group.description}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 flex items-center justify-between">
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
