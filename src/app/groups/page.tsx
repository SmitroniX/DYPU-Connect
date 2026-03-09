'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
import ChannelHeader from '@/components/ChannelHeader';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, Building, Hash, ArrowRight } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { useEffect, useState } from 'react';

export default function GroupsPage() {
    const { userProfile, currentUser: user } = useStore();
    const router = useRouter();
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!user || !userProfile) return;

        const groupIds = [
            `field_${userProfile.field.replace(/\s+/g, '_')}`,
            `year_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}`,
            `division_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}_${userProfile.division}`
        ];

        // Fetch unread counts for these groups
        const fetchUnreads = async () => {
            const counts: Record<string, number> = {};
            for (const id of groupIds) {
                try {
                    const snap = await getDoc(doc(db, 'groups', id));
                    if (snap.exists()) {
                        const data = snap.data();
                        counts[id] = data.unreadCount?.[user.uid] || 0;
                    }
                } catch (e) {
                    console.error('Error fetching unreads:', e);
                }
            }
            setUnreadCounts(counts);
        };

        fetchUnreads();
    }, [user, userProfile]);

    if (!userProfile) {
        return (
            <DashboardLayout>
                <LoadingSpinner variant="full" message="Loading groups…" />
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

    const handleJoinGroup = async (group: typeof groups[0]) => {
        if (!user || !userProfile) return;

        try {
            const groupRef = doc(db, 'groups', group.id);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                // Initial creation by the first student to visit
                const hierarchyInfo: any = { field: userProfile.field };
                if (group.type === 'Year Level' || group.type === 'Division Level') {
                    hierarchyInfo.year = userProfile.year;
                }
                if (group.type === 'Division Level') {
                    hierarchyInfo.division = userProfile.division;
                }

                await setDoc(groupRef, {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    type: group.type === 'Field Level' ? 'field' : group.type === 'Year Level' ? 'year' : 'division',
                    hierarchyInfo,
                    memberIds: [user.uid],
                    adminIds: [], // Admins set globally if needed
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Ensure membership
                await updateDoc(groupRef, {
                    memberIds: arrayUnion(user.uid)
                });
            }

            router.push(`/groups/${group.id}`);
        } catch (error) {
            console.error('Failed to join group:', error);
            toast.error('Failed to access group');
        }
    };

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disableGroups" moduleName="Groups">
            <div className="h-full flex flex-col">
                <ChannelHeader name="groups" description="Your auto-assigned campus groups" />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full animate-[fade-in-up_0.3s_ease-out]">
                    <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--ui-text-muted)] mb-2 px-1">
                            Your Groups
                        </h3>
                    </div>

                    <div className="space-y-1">
                        {groups.map((group) => {
                            const unread = unreadCounts[group.id] || 0;
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => handleJoinGroup(group)}
                                    className="w-full text-left surface-interactive flex items-center gap-3 px-3 py-3 group rounded-xl transition-all"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent-dim)] flex items-center justify-center shrink-0">
                                        <group.icon className="w-5 h-5 text-[var(--ui-accent)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Hash className="h-4 w-4 text-[var(--ui-text-muted)] shrink-0" />
                                            <p className={`text-[15px] group-hover:text-[var(--ui-text)] truncate transition-colors ${unread > 0 ? 'text-[var(--ui-text)] font-semibold' : 'text-[var(--ui-text-secondary)] font-medium'}`}>
                                                {group.name}
                                            </p>
                                        </div>
                                        <p className={`text-xs truncate ml-6 ${unread > 0 ? 'text-[var(--ui-text)] font-medium' : 'text-[var(--ui-text-muted)]'}`}>
                                            {group.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {unread > 0 && (
                                            <span className="bg-[var(--ui-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-medium text-[var(--ui-text-muted)] bg-[var(--ui-bg-elevated)] px-2 py-0.5 rounded-full">
                                            {group.type}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
