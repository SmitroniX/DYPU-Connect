'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus, Search, X } from 'lucide-react';
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
                const q = query(collection(db, 'users'), limit(50));
                const snapshot = await getDocs(q);
                const data: DirectoryUser[] = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<DirectoryUser, 'id'>) }))
                    .filter((u) => u.id !== user?.uid);
                setUsers(data);
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
            <div className="max-w-4xl mx-auto py-4 animate-[fade-in-up_0.5s_ease-out]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">💬 Messages</h1>
                        <p className="mt-2 text-sm text-slate-400">Your private campus conversations.</p>
                    </div>
                    <button
                        onClick={() => setShowNewChat(!showNewChat)}
                        className="flex items-center gap-2 bg-linear-to-r from-sky-300 to-slate-300 hover:from-sky-200 hover:to-slate-200 text-slate-900 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm shadow-lg shadow-sky-300/15"
                    >
                        {showNewChat ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showNewChat ? 'Cancel' : 'New Chat'}
                    </button>
                </div>

                {showNewChat && (
                    <div className="glass-strong p-5 mb-8 animate-[fade-in-up_0.3s_ease-out]">
                        <h3 className="font-bold text-white mb-4">Start a conversation</h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300/50 transition-all"
                                placeholder="Search students by name or field..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {filteredUsers.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => startChat(u)}
                                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl text-left transition-all"
                                >
                                    <img
                                        src={resolveProfileImage(u.profileImage || u.email, u.email, u.name || 'User')}
                                        alt=""
                                        className="w-9 h-9 rounded-full border border-white/20 object-cover object-center"
                                    />
                                    <div>
                                        <h4 className="text-sm font-medium text-white">{u.name}</h4>
                                        <p className="text-xs text-slate-500">{u.field} - {u.year} - {u.division}</p>
                                    </div>
                                </button>
                            ))}
                            {filteredUsers.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No students found.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="glass divide-y divide-white/5 overflow-hidden">
                    {chats.length === 0 ? (
                        <div className="text-center py-16">
                            <MessageSquare className="mx-auto h-12 w-12 text-slate-600" />
                            <h3 className="mt-3 text-sm font-semibold text-white">No messages</h3>
                            <p className="mt-1 text-sm text-slate-500">Get started by creating a new chat.</p>
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
                                    className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all group cursor-pointer"
                                >
                                    <img src={otherImage} alt={otherName} className="w-12 h-12 rounded-full border border-white/20 shrink-0 object-cover object-center" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-white truncate pr-4">{otherName}</h3>
                                            <span className="text-[10px] text-slate-600 shrink-0">
                                                {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 truncate">{chat.lastMessage || 'Say hello! 👋'}</p>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
