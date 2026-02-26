'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import Link from 'next/link';
import { MessageSquare, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface PrivateChat {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    participantImages: Record<string, string>;
    lastMessage: string;
    updatedAt: any;
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
    const [users, setUsers] = useState<DirectoryUser[]>([]); // For starting new chats
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { user } = useAuth();
    const { userProfile } = useStore();

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'private_chats'),
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PrivateChat[];
            setChats(data);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        // Fetch users for new chat
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

        // Check if chat already exists
        const existingChat = chats.find(c => c.participants.includes(otherUser.id));
        if (existingChat) {
            window.location.href = `/messages/${existingChat.id}`;
            return;
        }

        // Create new chat
        try {
            const docRef = await addDoc(collection(db, 'private_chats'), {
                participants: [user.uid, otherUser.id],
                participantNames: {
                    [user.uid]: userProfile.name,
                    [otherUser.id]: otherUser.name
                },
                participantImages: {
                    [user.uid]: resolveProfileImage(userProfile.profileImage, userProfile.email, userProfile.name),
                    [otherUser.id]: resolveProfileImage(otherUser.profileImage || otherUser.email, otherUser.email, otherUser.name || 'User')
                },
                lastMessage: '',
                updatedAt: serverTimestamp()
            });
            window.location.href = `/messages/${docRef.id}`;
        } catch (error) {
            toast.error('Failed to start conversation');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Messages</h1>
                        <p className="mt-2 text-sm text-gray-600">Your private campus conversations.</p>
                    </div>
                    <button
                        onClick={() => setShowNewChat(!showNewChat)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" /> New Chat
                    </button>
                </div>

                {showNewChat && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
                        <h3 className="font-semibold text-gray-900 mb-4">Start a conversation</h3>
                        <div className="relative mb-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
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
                                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left transition-colors"
                                >
                                    <img
                                        src={resolveProfileImage(u.profileImage || u.email, u.email, u.name || 'User')}
                                        alt=""
                                        className="w-8 h-8 rounded-full bg-gray-100 object-cover object-center"
                                    />
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">{u.name}</h4>
                                        <p className="text-xs text-gray-500">{u.field} - {u.year} - {u.division}</p>
                                    </div>
                                </button>
                            ))}
                            {filteredUsers.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">No students found.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                    {chats.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No messages</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new chat.</p>
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
                                    className="flex items-center gap-4 p-4 hover:bg-indigo-50 transition-colors group cursor-pointer"
                                >
                                    <img src={otherImage} alt={otherName} className="w-12 h-12 rounded-full border border-gray-200 shrink-0 object-cover object-center" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-sm font-bold text-gray-900 truncate pr-4">{otherName}</h3>
                                            <span className="text-[10px] text-gray-500 shrink-0">
                                                {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">{chat.lastMessage || 'Say hello!'}</p>
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
