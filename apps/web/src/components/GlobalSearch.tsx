'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    Search, X, User as UserIcon, Users, Ghost,
    MessageCircle, MessageSquareHeart, Settings,
    CornerDownLeft
} from 'lucide-react';
import Image from 'next/image';
import type { UserProfile } from '@/types/profile';
import type { Group } from '@/types/groups';
import { motion, AnimatePresence } from 'framer-motion';
import { ButtonSpinner } from '@/components/LoadingSpinner';

interface QuickCommand {
    id: string;
    title: string;
    path: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    keywords: string[];
}

const QUICK_COMMANDS: QuickCommand[] = [
    {
        id: 'confessions',
        title: 'Confessions',
        path: '/confessions',
        description: 'Read & share anonymous confessions',
        icon: Ghost,
        keywords: ['confessions', 'confession', 'secret', 'secrets', 'reveal', 'mood']
    },
    {
        id: 'public-chat',
        title: 'Campus Chat',
        path: '/public-chat',
        description: 'Real-time campus-wide chat and discussions',
        icon: MessageCircle,
        keywords: ['campus chat', 'chat', 'public', 'messages', 'talk', 'channel']
    },
    {
        id: 'anonymous-chat',
        title: 'Anonymous Chat',
        path: '/anonymous-chat',
        description: '1-on-1 anonymous roulette chat',
        icon: MessageSquareHeart,
        keywords: ['anonymous chat', 'anon', 'roulette', 'random', 'blind']
    },
    {
        id: 'groups',
        title: 'Student Groups',
        path: '/groups',
        description: 'Explore campus clubs, study groups & communities',
        icon: Users,
        keywords: ['student groups', 'groups', 'clubs', 'community', 'communities']
    },
    {
        id: 'profile',
        title: 'My Profile',
        path: '/profile',
        description: 'View and edit your student profile & bio',
        icon: UserIcon,
        keywords: ['my profile', 'profile', 'account', 'me', 'bio']
    },
    {
        id: 'settings',
        title: 'Settings',
        path: '/settings',
        description: 'App preferences, theme, and security',
        icon: Settings,
        keywords: ['settings', 'preferences', 'config', 'setup', 'theme', 'privacy']
    },
];

type SelectableItem = 
    | { type: 'command'; item: QuickCommand }
    | { type: 'user'; item: UserProfile }
    | { type: 'group'; item: Group };

export default function GlobalSearch() {
    const { searchModalOpen, setSearchModalOpen, currentUser } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [userResults, setUserResults] = useState<UserProfile[]>([]);
    const [groupResults, setGroupResults] = useState<Group[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const q = searchQuery.trim().toLowerCase();

    const filteredCommands = useMemo(() => {
        if (!q) return QUICK_COMMANDS;
        return QUICK_COMMANDS.filter(cmd =>
            cmd.title.toLowerCase().includes(q) ||
            cmd.path.toLowerCase().includes(q) ||
            cmd.description.toLowerCase().includes(q) ||
            cmd.keywords.some(k => k.toLowerCase().includes(q))
        );
    }, [q]);

    const selectableItems: SelectableItem[] = useMemo(() => [
        ...filteredCommands.map(item => ({ type: 'command' as const, item })),
        ...userResults.map(item => ({ type: 'user' as const, item })),
        ...groupResults.map(item => ({ type: 'group' as const, item })),
    ], [filteredCommands, userResults, groupResults]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, userResults, groupResults]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (searchModalOpen) {
            timer = setTimeout(() => {
                setSearchQuery('');
                setUserResults([]);
                setGroupResults([]);
                setSelectedIndex(0);
                inputRef.current?.focus();
            }, 0);
        }
        return () => clearTimeout(timer);
    }, [searchModalOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchModalOpen(true);
            }
            if (e.key === 'Escape' && searchModalOpen) {
                setSearchModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchModalOpen, setSearchModalOpen]);

    const performSearch = useCallback(async (searchStr: string) => {
        setIsSearching(true);
        try {
            // Users Query
            const usersRef = collection(db, 'users');
            const usersQ = query(
                usersRef,
                where('name', '>=', searchStr),
                where('name', '<=', searchStr + '\uf8ff'),
                limit(5)
            );
            
            // Groups Query
            const groupsRef = collection(db, 'groups');
            const groupsQ = query(
                groupsRef,
                where('name', '>=', searchStr),
                where('name', '<=', searchStr + '\uf8ff'),
                limit(5)
            );

            const [usersSnap, groupsSnap] = await Promise.all([
                getDocs(usersQ),
                getDocs(groupsQ)
            ]);

            const users = usersSnap.docs.map(doc => doc.data() as UserProfile).filter(u => u.userId !== currentUser?.uid);
            const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Group));

            setUserResults(users);
            setGroupResults(groups);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, [currentUser?.uid]);

    useEffect(() => {
        const searchTimer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch(searchQuery.trim());
            } else {
                setUserResults([]);
                setGroupResults([]);
            }
        }, 300); // debounce

        return () => clearTimeout(searchTimer);
    }, [searchQuery, performSearch]);

    const handleUserClick = (userId: string) => {
        setSearchModalOpen(false);
        router.push(`/profile/${userId}`);
    };

    const handleGroupClick = (groupId: string) => {
        setSearchModalOpen(false);
        router.push(`/groups/${groupId}`);
    };

    const handleCommandClick = (path: string) => {
        setSearchModalOpen(false);
        router.push(path);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectableItems.length > 0) {
                setSelectedIndex(prev => (prev + 1) % selectableItems.length);
            }
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectableItems.length > 0) {
                setSelectedIndex(prev => (prev - 1 + selectableItems.length) % selectableItems.length);
            }
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectableItems.length > 0 && selectedIndex >= 0 && selectedIndex < selectableItems.length) {
                const target = selectableItems[selectedIndex];
                if (target.type === 'command') {
                    handleCommandClick(target.item.path);
                } else if (target.type === 'user') {
                    handleUserClick(target.item.userId);
                } else if (target.type === 'group') {
                    handleGroupClick(target.item.id);
                }
            }
            return;
        }
    };

    return (
        <AnimatePresence>
            {searchModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4 pointer-events-none">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" 
                        onClick={() => setSearchModalOpen(false)}
                    />
                    
                    {/* Modal */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                    >
                        {/* Search Input Bar */}
                        <div className="flex items-center px-4 py-3 border-b border-[var(--ui-border)]">
                            <Search className="w-5 h-5 text-[var(--ui-text-secondary)] shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search or jump to... (Press ↑↓ to navigate)"
                                className="flex-1 bg-transparent border-none outline-none px-3 text-[var(--ui-text)] placeholder-zinc-500 font-medium text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                            />
                            {isSearching && (
                                <ButtonSpinner tone="muted" size="xs" className="mr-2" />
                            )}
                            <button 
                                onClick={() => setSearchModalOpen(false)}
                                className="p-1 rounded-md text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-elevated)] transition-colors"
                                title="Close (Esc)"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search / Command Results */}
                        <motion.div 
                            layout
                            className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 space-y-4"
                        >
                            <AnimatePresence mode="popLayout">
                                {searchQuery.trim().length >= 2 && !isSearching && userResults.length === 0 && groupResults.length === 0 && filteredCommands.length === 0 && (
                                    <motion.div 
                                        key="no-results"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-4 py-12 text-center text-[var(--ui-text-muted)] text-sm"
                                    >
                                        No results found for &quot;{searchQuery}&quot;
                                    </motion.div>
                                )}

                                {/* Quick Commands & Navigation Section */}
                                {filteredCommands.length > 0 && (
                                    <motion.div 
                                        key="commands"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="space-y-1"
                                    >
                                        <div className="px-3 py-1 text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider flex items-center justify-between">
                                            <span>Quick Commands & Navigation</span>
                                            {!searchQuery.trim() && (
                                                <span className="text-[10px] font-normal lowercase opacity-60">↑↓ to navigate • ↵ to select</span>
                                            )}
                                        </div>
                                        {filteredCommands.map((cmd) => {
                                            const itemIndex = selectableItems.findIndex(i => i.type === 'command' && i.item.id === cmd.id);
                                            const isSelected = itemIndex === selectedIndex;
                                            const Icon = cmd.icon;
                                            return (
                                                <motion.div
                                                    layout
                                                    key={cmd.id}
                                                    onClick={() => handleCommandClick(cmd.path)}
                                                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                                                        isSelected
                                                            ? 'bg-[var(--ui-bg-elevated)] ring-1 ring-[var(--ui-accent)]/50 shadow-sm'
                                                            : 'hover:bg-[var(--ui-bg-elevated)]'
                                                    }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                                                        isSelected
                                                            ? 'bg-[var(--ui-accent)]/20 border-[var(--ui-accent)]/50 text-[var(--ui-accent)]'
                                                            : 'bg-[var(--ui-bg-surface)] border-[var(--ui-border)] text-[var(--ui-text-secondary)]'
                                                    }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-[var(--ui-text)]">
                                                                {cmd.title}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-[var(--ui-text-muted)] px-1.5 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]/50">
                                                                {cmd.path}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-[var(--ui-text-muted)] truncate">
                                                            {cmd.description}
                                                        </div>
                                                    </div>
                                                    <div className={`text-[var(--ui-text-muted)] transition-opacity flex items-center gap-1 text-xs ${
                                                        isSelected ? 'opacity-100 text-[var(--ui-accent)]' : 'opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        <CornerDownLeft className="w-3.5 h-3.5" />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                )}

                                {/* Users Section */}
                                {userResults.length > 0 && (
                                    <motion.div 
                                        key="users"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="space-y-1"
                                    >
                                        <div className="px-3 py-1 text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">
                                            Users
                                        </div>
                                        {userResults.map((user) => {
                                            const itemIndex = selectableItems.findIndex(i => i.type === 'user' && i.item.userId === user.userId);
                                            const isSelected = itemIndex === selectedIndex;
                                            return (
                                                <motion.div
                                                    layout
                                                    key={user.userId}
                                                    onClick={() => handleUserClick(user.userId)}
                                                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                                                        isSelected
                                                            ? 'bg-[var(--ui-bg-elevated)] ring-1 ring-[var(--ui-accent)]/50 shadow-sm'
                                                            : 'hover:bg-[var(--ui-bg-elevated)]'
                                                    }`}
                                                >
                                                    {user.profileImage ? (
                                                        <Image
                                                            src={user.profileImage}
                                                            alt={user.name}
                                                            width={36}
                                                            height={36}
                                                            className="rounded-full object-cover w-9 h-9 border border-[var(--ui-border)] group-hover:border-[var(--ui-border)]"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center border border-[var(--ui-border)]">
                                                            <UserIcon className="w-4 h-4 text-[var(--ui-text-secondary)]" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-[var(--ui-text)] truncate group-hover:text-[var(--ui-text)] transition-colors">
                                                            {user.name}
                                                        </div>
                                                        {user.field && (
                                                            <div className="text-xs text-[var(--ui-text-muted)] truncate">
                                                                {user.field} • {user.year}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`text-[var(--ui-text-muted)] transition-opacity flex items-center gap-1 text-xs ${
                                                        isSelected ? 'opacity-100 text-[var(--ui-accent)]' : 'opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        <CornerDownLeft className="w-3.5 h-3.5" />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                )}

                                {/* Groups Section */}
                                {groupResults.length > 0 && (
                                    <motion.div 
                                        key="groups"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="space-y-1"
                                    >
                                        <div className="px-3 py-1 text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">
                                            Groups
                                        </div>
                                        {groupResults.map((group) => {
                                            const itemIndex = selectableItems.findIndex(i => i.type === 'group' && i.item.id === group.id);
                                            const isSelected = itemIndex === selectedIndex;
                                            return (
                                                <motion.div
                                                    layout
                                                    key={group.id}
                                                    onClick={() => handleGroupClick(group.id)}
                                                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                                                        isSelected
                                                            ? 'bg-[var(--ui-bg-elevated)] ring-1 ring-[var(--ui-accent)]/50 shadow-sm'
                                                            : 'hover:bg-[var(--ui-bg-elevated)]'
                                                    }`}
                                                >
                                                    {group.avatarUrl ? (
                                                        <Image
                                                            src={group.avatarUrl}
                                                            alt={group.name}
                                                            width={36}
                                                            height={36}
                                                            className="rounded-md object-cover w-9 h-9 border border-[var(--ui-border)] group-hover:border-[var(--ui-border)]"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-md bg-[var(--ui-bg-elevated)] flex items-center justify-center border border-[var(--ui-border)]">
                                                            <Users className="w-4 h-4 text-[var(--ui-text-secondary)]" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-[var(--ui-text)] truncate group-hover:text-[var(--ui-text)] transition-colors">
                                                            {group.name}
                                                        </div>
                                                        {group.type && (
                                                            <div className="text-xs text-[var(--ui-text-muted)] truncate capitalize">
                                                                {group.type} {group.memberIds ? `• ${group.memberIds.length} members` : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`text-[var(--ui-text-muted)] transition-opacity flex items-center gap-1 text-xs ${
                                                        isSelected ? 'opacity-100 text-[var(--ui-accent)]' : 'opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        <CornerDownLeft className="w-3.5 h-3.5" />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Command Palette Keyboard Footer */}
                        <div className="px-4 py-2 border-t border-[var(--ui-border)] bg-[var(--ui-bg-base)]/50 flex items-center justify-between text-[11px] text-[var(--ui-text-muted)]">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] font-mono text-[10px]">↑↓</kbd>
                                    Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] font-mono text-[10px]">↵</kbd>
                                    Select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] font-mono text-[10px]">Esc</kbd>
                                    Close
                                </span>
                            </div>
                            <span className="opacity-70 hidden sm:inline">DYPU Connect Command Palette</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
