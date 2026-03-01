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
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrivateChat[];
            setChats(data);
        });
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
                        <div className="surface m-4 p-5 animate-[fade-in-up_0.3s_ease-out]">
                            <h3 className="font-bold text-[var(--ui-text)] mb-4">Start a conversation</h3>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ui-text-muted)]" />
                                <input
                                    type="text"
                                    className="input pl-10"
                                    placeholder="Search students by name or field..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-0.5">
                                {filteredUsers.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => startChat(u)}
                                        className="w-full flex items-center gap-3 p-2.5 hover:bg-[var(--ui-bg-hover)] rounded text-left transition-colors"
                                    >
                                        <img
                                            src={resolveProfileImage(u.profileImage || u.email, u.email, u.name || 'User')}
                                            alt=""
                                            className="w-9 h-9 rounded-full object-cover object-center"
                                        />
                                        <div>
                                            <h4 className="text-sm font-medium text-[var(--ui-text)]">{u.name}</h4>
                                            <p className="text-xs text-[var(--ui-text-muted)]">{u.field} - {u.year} - {u.division}</p>
                                        </div>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <p className="text-sm text-[var(--ui-text-muted)] text-center py-4">No students found.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-[var(--ui-divider)]">
                        {chats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
                                <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                    <MessageSquare className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--ui-text)]">No messages yet</h3>
                                <p className="text-sm text-[var(--ui-text-muted)] mt-1">Get started by creating a new chat.</p>
                            </div>
                        ) : (
                            chats.map((chat) => {
                                const otherUserId = chat.participants.find(id => id !== user?.uid) || '';
                                const otherName = chat.participantNames?.[otherUserId] || 'Unknown User';
                                const otherImage = resolveProfileImage(chat.participantImages?.[otherUserId], undefined, otherName);

                                return (
                                    <Link
                                        key={chat.id}
                                        href={`/messages/${chat.id}`}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--ui-bg-hover)] transition-colors group cursor-pointer"
                                    >
                                        <div className="relative shrink-0">
                                            <img src={otherImage} alt={otherName} className="w-10 h-10 rounded-full object-cover object-center" />
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--ui-text-muted)] rounded-full ring-[3px] ring-[var(--ui-bg-base)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h3 className="text-[15px] font-medium text-[var(--ui-text)] truncate pr-4">{otherName}</h3>
                                                <span className="text-[10px] text-[var(--ui-text-muted)] shrink-0">
                                                    {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--ui-text-secondary)] truncate">{chat.lastMessage || 'Say hello! 👋'}</p>
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
