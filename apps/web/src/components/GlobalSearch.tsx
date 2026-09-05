'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, X, User as UserIcon, Users } from 'lucide-react';
import Image from 'next/image';
import type { UserProfile } from '@/types/profile';
import type { Group } from '@/types/groups';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalSearch() {
    const { searchModalOpen, setSearchModalOpen, currentUser } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [userResults, setUserResults] = useState<UserProfile[]>([]);
    const [groupResults, setGroupResults] = useState<Group[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (searchModalOpen) {
            timer = setTimeout(() => {
                setSearchQuery('');
                setUserResults([]);
                setGroupResults([]);
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

    const performSearch = useCallback(async (q: string) => {
        setIsSearching(true);
        try {
            // Users Query
            const usersRef = collection(db, 'users');
            const usersQ = query(
                usersRef,
                where('name', '>=', q),
                where('name', '<=', q + '\uf8ff'),
                limit(5)
            );
            
            // Groups Query
            const groupsRef = collection(db, 'groups');
            const groupsQ = query(
                groupsRef,
                where('name', '>=', q),
                where('name', '<=', q + '\uf8ff'),
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
                                placeholder="Search users and groups..."
                                className="flex-1 bg-transparent border-none outline-none px-3 text-[var(--ui-text)] placeholder-zinc-500 font-medium text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin mr-2 shrink-0" 
                                />
                            )}
                            <button 
                                onClick={() => setSearchModalOpen(false)}
                                className="p-1 rounded-md text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-elevated)] transition-colors"
                                title="Close (Esc)"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Results */}
                        <motion.div 
                            layout
                            className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 space-y-4"
                        >
                            <AnimatePresence mode="popLayout">
                                {!searchQuery.trim() && (
                                    <motion.div 
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-4 py-12 text-center text-[var(--ui-text-muted)] text-sm"
                                    >
                                        Type to start searching across DYPU Connect.
                                        <div className="mt-2 text-xs opacity-60">Press Ctrl+K (or Cmd+K) anywhere to search.</div>
                                    </motion.div>
                                )}

                                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                                    <motion.div 
                                        key="typing"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-4 py-6 text-center text-[var(--ui-text-muted)] text-sm"
                                    >
                                        Keep typing...
                                    </motion.div>
                                )}

                                {searchQuery.trim().length >= 2 && !isSearching && userResults.length === 0 && groupResults.length === 0 && (
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
                                        {userResults.map((user) => (
                                            <motion.div
                                                layout
                                                key={user.userId}
                                                onClick={() => handleUserClick(user.userId)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--ui-bg-elevated)] transition-colors group"
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
                                                    <div className="text-sm font-medium text-[var(--ui-text)] truncate group-hover:text-\[var(--ui-text)\] transition-colors">
                                                        {user.name}
                                                    </div>
                                                    {user.field && (
                                                        <div className="text-xs text-[var(--ui-text-muted)] truncate">
                                                            {user.field} • {user.year}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
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
                                        {groupResults.map((group) => (
                                            <motion.div
                                                layout
                                                key={group.id}
                                                onClick={() => handleGroupClick(group.id)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--ui-bg-elevated)] transition-colors group"
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
                                                    <div className="text-sm font-medium text-[var(--ui-text)] truncate group-hover:text-\[var(--ui-text)\] transition-colors">
                                                        {group.name}
                                                    </div>
                                                    {group.type && (
                                                        <div className="text-xs text-[var(--ui-text-muted)] truncate capitalize">
                                                            {group.type} {group.memberIds ? `• ${group.memberIds.length} members` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
