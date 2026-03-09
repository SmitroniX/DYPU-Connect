'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus, Search, X } from 'lucide-react';
import { cacheGet } from '@/lib/cache';
import toast from 'react-hot-toast';

interface PrivateChat {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    participantImages: Record<string, string>;
    lastMessage: string;
    updatedAt: Timestamp | null;
    unreadCount?: Record<string, number>;
}

interface DirectoryUser {
    id: string;
    name?: string;
    email?: string;
    profileImage?: string;
    field?: string;
    year?: string;
    division?: string;
}

export default function InboxPage() {
    const [chats, setChats] = useState<PrivateChat[]>([]);
    const [users, setUsers] = useState<DirectoryUser[]>([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { user } = useAuth();
    const { userProfile } = useStore();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'private_chats'),
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrivateChat[];
                setChats(data);
            },
            (error) => {
                console.error('Messages listener error:', error);
                if (error.code === 'failed-precondition') {
                    toast.error('Chat index is building. Please wait a minute and refresh.');
                } else if (error.code === 'permission-denied') {
                    toast.error('You don\'t have permission to access messages.');
                } else {
                    toast.error('Failed to load messages. Please refresh.');
                }
            }
        );
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (showNewChat) {
            const fetchUsers = async () => {
                const data = await cacheGet<DirectoryUser[]>(
                    'user_directory',
                    async () => {
                        const q = query(collection(db, 'users'), limit(50));
                        const snapshot = await getDocs(q);
                        return snapshot.docs
                            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<DirectoryUser, 'id'>) }));
                    },
                    { ttl: 120_000, swr: 600_000 }
                );
                setUsers(data.filter((u) => u.id !== user?.uid));
            };
            fetchUsers();
        }
    }, [showNewChat, user]);

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.field?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startChat = async (otherUser: DirectoryUser) => {
        if (!user || !userProfile) return;
        const existingChat = chats.find(c => c.participants.includes(otherUser.id));
        if (existingChat) {
            router.push(`/messages/${existingChat.id}`);
            return;
        }
        try {
            const docRef = await addDoc(collection(db, 'private_chats'), {
                participants: [user.uid, otherUser.id],
                participantNames: { [user.uid]: userProfile.name, [otherUser.id]: otherUser.name },
                participantImages: {
                    [user.uid]: resolveProfileImage(userProfile.profileImage, userProfile.email, userProfile.name),
                    [otherUser.id]: resolveProfileImage(otherUser.profileImage || otherUser.email, otherUser.email, otherUser.name || 'User')
                },
                lastMessage: '',
                updatedAt: serverTimestamp()
            });
            router.push(`/messages/${docRef.id}`);
        } catch {
            toast.error('Failed to start conversation');
        }
    };

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name="messages" description="Your private campus conversations" type="dm">
                    <button
                        onClick={() => setShowNewChat(!showNewChat)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-bg-elevated)] text-sm font-semibold rounded transition-colors"
                    >
                        {showNewChat ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {showNewChat ? 'Cancel' : 'New Chat'}
                    </button>
                </ChannelHeader>

                <div className="flex-1 overflow-y-auto">
                    {showNewChat && (
                        <div className="surface mx-4 mt-6 mb-2 p-5 animate-[fade-in-up_0.3s_ease-out] border-[var(--ui-border)] shadow-lg">
                            <h3 className="font-bold text-[var(--ui-text)] mb-4 text-lg">Start a conversation</h3>
                            <div className="relative mb-4">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ui-text-muted)]" />
                                <input
                                    type="text"
                                    className="input pl-10 bg-[var(--ui-bg-input)] border border-[var(--ui-border)] focus:border-[var(--ui-accent)] focus:ring-1 focus:ring-[var(--ui-accent)] transition-all rounded-lg"
                                    placeholder="Search students by name or field..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                                {filteredUsers.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => startChat(u)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-[var(--ui-bg-hover)] rounded-lg text-left transition-colors group"
                                    >
                                        <img
                                            src={resolveProfileImage(u.profileImage || u.email, u.email, u.name || 'User')}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover object-center ring-2 ring-transparent group-hover:ring-[var(--ui-accent-dim)] transition-all"
                                        />
                                        <div>
                                            <h4 className="text-[15px] font-medium text-[var(--ui-text)] group-hover:text-[var(--ui-accent)] transition-colors">{u.name}</h4>
                                            <p className="text-xs text-[var(--ui-text-muted)] mt-0.5">{u.field} • {u.year} • {u.division}</p>
                                        </div>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Search className="h-8 w-8 text-[var(--ui-text-muted)] mb-3 opacity-50" />
                                        <p className="text-sm font-medium text-[var(--ui-text-secondary)]">No students found</p>
                                        <p className="text-xs text-[var(--ui-text-muted)] mt-1">Try a different search term</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="p-4 space-y-3">
                        {chats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] text-center surface border border-[var(--ui-border)] mx-4 rounded-xl">
                                <div className="w-20 h-20 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-6 shadow-sm border border-[var(--ui-border)]">
                                    <MessageSquare className="h-10 w-10 text-[var(--ui-accent)] opacity-80" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--ui-text)]">No messages yet</h3>
                                <p className="text-sm text-[var(--ui-text-muted)] mt-2 max-w-[250px] leading-relaxed">
                                    Get started by creating a new chat and striking up a conversation.
                                </p>
                            </div>
                        ) : (
                            chats.map((chat) => {
                                const otherUserId = chat.participants.find(id => id !== user?.uid) || '';
                                const otherName = chat.participantNames?.[otherUserId] || 'Unknown User';
                                const otherImage = resolveProfileImage(chat.participantImages?.[otherUserId], undefined, otherName);
                                const unreadCount = chat.unreadCount?.[user?.uid || ''] ?? 0;
                                const isUnread = unreadCount > 0;

                                return (
                                    <Link
                                        key={chat.id}
                                        href={`/messages/${chat.id}`}
                                        className="surface-interactive flex items-center gap-4 px-4 py-3.5 group cursor-pointer"
                                    >
                                        <div className="relative shrink-0">
                                            <img src={otherImage} alt={otherName} className="w-12 h-12 rounded-full object-cover object-center ring-2 ring-[var(--ui-bg-base)] group-hover:ring-[var(--ui-bg-hover)] transition-all" />
                                            {/* Online status indicator placeholder - currently random/static design for UI */}
                                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-[3px] ring-[var(--ui-bg-surface)] group-hover:ring-[var(--ui-bg-hover)] transition-all" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className={`text-[15px] ${isUnread ? 'font-bold text-[var(--ui-text)]' : 'font-medium text-[var(--ui-text-secondary)]'} truncate pr-4 transition-colors group-hover:text-[var(--ui-text)]`}>
                                                    {otherName}
                                                </h3>
                                                <span className={`text-xs whitespace-nowrap ${isUnread ? 'text-[var(--ui-accent)] font-medium' : 'text-[var(--ui-text-muted)]'}`}>
                                                    {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-4">
                                                <p className={`text-sm truncate ${isUnread ? 'text-[var(--ui-text)] font-semibold' : 'text-[var(--ui-text-muted)]'}`}>
                                                    {chat.lastMessage || 'Say hello! 👋'}
                                                </p>
                                                {isUnread && (
                                                    <span className="shrink-0 bg-[var(--ui-accent)] text-[var(--ui-accent-text)] text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center shadow-[0_0_12px_rgba(129,140,248,0.4)]">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
