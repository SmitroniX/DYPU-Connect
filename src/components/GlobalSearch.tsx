'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, X, User as UserIcon, Users } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';
import type { UserProfile } from '@/types/profile';
import type { Group } from '@/types/groups';

export default function GlobalSearch() {
    const { searchModalOpen, setSearchModalOpen, currentUser } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [userResults, setUserResults] = useState<UserProfile[]>([]);
    const [groupResults, setGroupResults] = useState<Group[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (searchModalOpen) {
            setSearchQuery('');
            setUserResults([]);
            setGroupResults([]);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
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
    }, [searchQuery]);

    const performSearch = async (q: string) => {
        setIsSearching(true);
        try {
            // Case sensitive prefix search (Firestore limitation, but good enough for simple starts)
            // Ideally we'd use a dedicated search service (like Algolia or Typesense) for full-text.
            // But for now, a case-sensitive prefix string search on "name"
            const queryUpper = q.charAt(0).toUpperCase() + q.slice(1);
            const queryLower = q.toLowerCase();

            // To make it slightly better, search twice or standardise on lower bounds
            // Assuming users input exact case, or close to it. We'll search by the exact query for simplicity
            
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
            const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));

            setUserResults(users);
            setGroupResults(groups);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    if (!searchModalOpen) return null;

    const handleUserClick = (userId: string) => {
        setSearchModalOpen(false);
        // Using chat route pattern based on users logic you might have
        // Usually clicking user routes to profile or starts private chat. Let's route to their profile view if exists, or private chat.
        // I will route to /profile/[userId] by assumption.
        router.push(`/profile/${userId}`);
    };

    const handleGroupClick = (groupId: string) => {
        setSearchModalOpen(false);
        router.push(`/groups/${groupId}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                onClick={() => setSearchModalOpen(false)}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Search Input Bar */}
                <div className="flex items-center px-4 py-3 border-b border-zinc-800">
                    <Search className="w-5 h-5 text-zinc-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search users and groups..."
                        className="flex-1 bg-transparent border-none outline-none px-3 text-zinc-100 placeholder-zinc-500 font-medium text-base"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin mr-2 shrink-0" />
                    )}
                    <button 
                        onClick={() => setSearchModalOpen(false)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Results */}
                <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 space-y-4">
                    {!searchQuery.trim() && (
                        <div className="px-4 py-12 text-center text-zinc-500 text-sm">
                            Type to start searching across DYPU Connect.
                            <div className="mt-2 text-xs opacity-60">Press Ctrl+K (or Cmd+K) anywhere to search.</div>
                        </div>
                    )}

                    {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                        <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                            Keep typing...
                        </div>
                    )}

                    {searchQuery.trim().length >= 2 && !isSearching && userResults.length === 0 && groupResults.length === 0 && (
                        <div className="px-4 py-12 text-center text-zinc-500 text-sm">
                            No results found for "{searchQuery}"
                        </div>
                    )}

                    {/* Users Section */}
                    {userResults.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Users
                            </div>
                            {userResults.map((user) => (
                                <div
                                    key={user.userId}
                                    onClick={() => handleUserClick(user.userId)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                                >
                                    {user.profileImage ? (
                                        <Image
                                            src={user.profileImage}
                                            alt={user.name}
                                            width={36}
                                            height={36}
                                            className="rounded-full object-cover w-9 h-9 border border-zinc-800 group-hover:border-zinc-700"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                            <UserIcon className="w-4 h-4 text-zinc-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                                            {user.name}
                                        </div>
                                        {user.field && (
                                            <div className="text-xs text-zinc-500 truncate">
                                                {user.field} • {user.year}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Groups Section */}
                    {groupResults.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Groups
                            </div>
                            {groupResults.map((group) => (
                                <div
                                    key={group.id}
                                    onClick={() => handleGroupClick(group.id)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                                >
                                    {group.avatarUrl ? (
                                        <Image
                                            src={group.avatarUrl}
                                            alt={group.name}
                                            width={36}
                                            height={36}
                                            className="rounded-md object-cover w-9 h-9 border border-zinc-800 group-hover:border-zinc-700"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-md bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                            <Users className="w-4 h-4 text-zinc-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                                            {group.name}
                                        </div>
                                        {group.type && (
                                            <div className="text-xs text-zinc-500 truncate capitalize">
                                                {group.type} {group.memberIds ? `• ${group.memberIds.length} members` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
