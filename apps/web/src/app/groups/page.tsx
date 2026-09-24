'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { 
    BookOpen, GraduationCap, Building, ArrowRight, 
    Users, Search, X, Hash, Sparkles
} from 'lucide-react';
import { GroupGridSkeleton, Skeleton } from '@/components/Skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, type Variants } from 'framer-motion';

const CATEGORY_FILTERS = [
    { key: 'all', label: 'All Groups' },
    { key: 'field', label: 'Department' },
    { key: 'year', label: 'Cohort' },
    { key: 'division', label: 'Class' },
] as const;

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.05,
        },
    },
};

const itemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 22,
        },
    },
};

export default function GroupsPage() {
    const { userProfile, currentUser: user } = useStore();
    const router = useRouter();
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [joiningId, setJoiningId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !userProfile) return;

        const groupIds = [
            `field_${userProfile.field.replace(/\s+/g, '_')}`,
            `year_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}`,
            `division_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}_${userProfile.division}`
        ];

        // Fetch unread counts and member counts for these groups
        const fetchGroupMeta = async () => {
            const counts: Record<string, number> = {};
            const members: Record<string, number> = {};
            for (const id of groupIds) {
                try {
                    const snap = await getDoc(doc(db, 'groups', id));
                    if (snap.exists()) {
                        const data = snap.data();
                        counts[id] = data.unreadCount?.[user.uid] || 0;
                        if (Array.isArray(data.memberIds) && data.memberIds.length > 0) {
                            members[id] = data.memberIds.length;
                        }
                    }
                } catch (e) {
                    console.error('Error fetching group meta:', e);
                }
            }
            setUnreadCounts(counts);
            setMemberCounts(members);
        };

        fetchGroupMeta();
    }, [user, userProfile]);

    const groups = useMemo(() => {
        if (!userProfile) return [];
        return [
            {
                id: `field_${userProfile.field.replace(/\s+/g, '_')}`,
                name: userProfile.field,
                category: 'field',
                type: 'Field Level',
                categoryLabel: 'Department',
                description: `Discussions and announcements for all ${userProfile.field} students across cohorts.`,
                icon: BookOpen,
                colorToken: {
                    badge: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/25',
                    border: 'hover:border-indigo-500/50',
                    gradient: 'from-indigo-500/15 via-blue-500/5 to-transparent',
                    iconBg: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-indigo-500/30',
                },
                defaultMembers: '450+',
            },
            {
                id: `year_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}`,
                name: `${userProfile.field} - ${userProfile.year}`,
                category: 'year',
                type: 'Year Level',
                categoryLabel: 'Cohort',
                description: `Discussions for ${userProfile.year} ${userProfile.field} students. Coursework, projects & deadlines.`,
                icon: GraduationCap,
                colorToken: {
                    badge: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25',
                    border: 'hover:border-emerald-500/50',
                    gradient: 'from-emerald-500/15 via-teal-500/5 to-transparent',
                    iconBg: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30',
                },
                defaultMembers: '180+',
            },
            {
                id: `division_${userProfile.field.replace(/\s+/g, '_')}_${userProfile.year.replace(/\s+/g, '_')}_${userProfile.division}`,
                name: `${userProfile.year} Div ${userProfile.division}`,
                category: 'division',
                type: 'Division Level',
                categoryLabel: 'Class',
                description: `Your primary class group (Division ${userProfile.division}). Daily timetables, lab batches & notices.`,
                icon: Building,
                colorToken: {
                    badge: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/25',
                    border: 'hover:border-amber-500/50',
                    gradient: 'from-amber-500/15 via-orange-500/5 to-transparent',
                    iconBg: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30',
                },
                defaultMembers: '60+',
            }
        ];
    }, [userProfile]);

    const filteredGroups = useMemo(() => {
        return groups.filter(g => {
            const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
            const matchesSearch = !searchQuery.trim() || 
                g.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                g.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                g.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase().trim());
            return matchesCategory && matchesSearch;
        });
    }, [groups, selectedCategory, searchQuery]);

    const handleJoinGroup = async (group: typeof groups[0]) => {
        if (!user || !userProfile) return;
        setJoiningId(group.id);

        try {
            const groupRef = doc(db, 'groups', group.id);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                const hierarchyInfo: Record<string, string> = { field: userProfile.field };
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
                    adminIds: [],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } else {
                await updateDoc(groupRef, {
                    memberIds: arrayUnion(user.uid)
                });
            }

            router.push(`/groups/${group.id}`);
        } catch (error) {
            console.error('Failed to join group:', error);
            toast.error('Failed to access group');
            setJoiningId(null);
        }
    };

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disableGroups" moduleName="Groups">
                <div className="h-full flex flex-col">
                    <PageHeader 
                        title="Campus Groups" 
                        description="Your auto-assigned academic and cohort spaces"
                        icon={<Users className="h-4.5 w-4.5 text-[var(--ui-accent)]" />}
                    />

                    <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
                        {!userProfile ? (
                            <div className="space-y-4">
                                <div className="mb-4">
                                    <Skeleton variant="text" className="h-4 w-32 rounded mb-2" />
                                </div>
                                <GroupGridSkeleton count={3} />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Search & Category Filter Pills Bar */}
                                <div className="space-y-3">
                                    {/* Search Input with glass styling */}
                                    <div className="relative w-full">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ui-text-muted)] pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search groups by name, branch, or keywords..."
                                            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl bg-[var(--ui-bg-surface)]/80 backdrop-blur-md border border-[var(--ui-border)] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent)]/20 transition-all shadow-sm font-medium"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                                                title="Clear search"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Category Filter Pills with smooth active indicator (layoutId="group-category-pill") */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                                        {CATEGORY_FILTERS.map((cat) => {
                                            const isActive = selectedCategory === cat.key;
                                            return (
                                                <button
                                                    key={cat.key}
                                                    onClick={() => setSelectedCategory(cat.key)}
                                                    className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                                                        isActive 
                                                            ? 'text-white' 
                                                            : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] bg-[var(--ui-bg-elevated)]/60'
                                                    }`}
                                                >
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="group-category-pill"
                                                            className="absolute inset-0 rounded-full bg-[var(--ui-accent)] shadow-md shadow-[var(--ui-accent)]/25"
                                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10">{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active Groups Count & Hub status */}
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--ui-text-muted)] flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
                                        Your Assigned Cohorts ({filteredGroups.length})
                                    </h3>
                                    <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                                        Auto-synced with student credentials
                                    </span>
                                </div>

                                {/* Modern Interactive Group Cards Grid */}
                                {filteredGroups.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-[var(--ui-bg-surface)]/60 border border-[var(--ui-border)]">
                                        <div className="h-16 w-16 rounded-3xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4 text-[var(--ui-text-muted)]">
                                            <Users className="h-8 w-8" />
                                        </div>
                                        <h4 className="text-base font-bold text-[var(--ui-text)]">
                                            No matching groups found
                                        </h4>
                                        <p className="text-xs text-[var(--ui-text-muted)] mt-1 max-w-xs">
                                            Try adjusting your search query or reset to &quot;All Groups&quot;.
                                        </p>
                                        <button
                                            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                            className="mt-4 px-4 py-2 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                ) : (
                                    <motion.div 
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                                    >
                                        {filteredGroups.map((group) => {
                                            const unread = unreadCounts[group.id] || 0;
                                            const memberCount = memberCounts[group.id];
                                            const isJoining = joiningId === group.id;

                                            return (
                                                <motion.div
                                                    key={group.id}
                                                    variants={itemVariants}
                                                    whileHover={{ y: -5, scale: 1.01 }}
                                                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                                                    className={`group relative rounded-3xl border border-[var(--ui-border)] ${group.colorToken.border} bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden`}
                                                >
                                                    {/* Ambient card gradient */}
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${group.colorToken.gradient} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`} />

                                                    <div className="relative z-10">
                                                        {/* Top Row: Category tag with color tokens + Member count chip + Unread badge */}
                                                        <div className="flex items-center justify-between gap-2 mb-4">
                                                            {/* Category tag */}
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${group.colorToken.badge} shadow-xs`}>
                                                                {group.categoryLabel}
                                                            </span>

                                                            <div className="flex items-center gap-1.5">
                                                                {/* Unread badge */}
                                                                {unread > 0 && (
                                                                    <span className="bg-[var(--ui-accent)] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse">
                                                                        {unread > 99 ? '99+' : unread} new
                                                                    </span>
                                                                )}

                                                                {/* Member count chip with Users icon */}
                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ui-bg-elevated)]/80 border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-xs">
                                                                    <Users className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
                                                                    <span>{memberCount ? `${memberCount} members` : group.defaultMembers}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Icon & Group Name */}
                                                        <div className="flex items-start gap-3.5 mb-3">
                                                            <div className={`h-12 w-12 rounded-2xl ${group.colorToken.iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                                                                <group.icon className="w-6 h-6" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-base sm:text-lg font-black text-[var(--ui-text)] tracking-tight leading-snug group-hover:text-[var(--ui-accent)] transition-colors truncate">
                                                                    {group.name}
                                                                </h4>
                                                                <span className="text-[11px] text-[var(--ui-text-muted)] font-semibold flex items-center gap-1 mt-0.5">
                                                                    <Hash className="w-3 h-3 text-[var(--ui-text-muted)]" />
                                                                    {group.type}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <p className="text-xs sm:text-sm text-[var(--ui-text-secondary)] font-medium leading-relaxed mb-6 line-clamp-2">
                                                            {group.description}
                                                        </p>
                                                    </div>

                                                    {/* Bottom Row: Open Channel button with spring micro-interaction */}
                                                    <div className="relative z-10 pt-4 border-t border-[var(--ui-divider)]/60 flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-[var(--ui-text-muted)]">
                                                            Auto-Assigned
                                                        </span>

                                                        <motion.button
                                                            onClick={() => handleJoinGroup(group)}
                                                            disabled={isJoining}
                                                            whileHover={{ scale: 1.04 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--ui-accent)] text-white text-xs font-black shadow-md shadow-[var(--ui-accent)]/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer group/btn"
                                                        >
                                                            <span>{isJoining ? 'Opening...' : 'Open Channel'}</span>
                                                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
