'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { Send, ArrowLeft, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderProfileImage: string;
    timestamp: any;
}

export default function GroupChatDetail({ params }: { params: { groupId: string } }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Reconstruct a readable name from the ID for UI fallback
    const humanReadableName = decodeURIComponent(params.groupId)
        .replace(/^field_|^year_|^division_/, '')
        .replace(/_/g, ' ');

    // Very basic security: Ensure the user belongs to this group based on their profile data.
    // In a real app, Firestore Security Rules would validate `request.auth.uid` against a member list, or validate claims.
    const isAuthorized = () => {
        if (!userProfile) return false;
        const gid = params.groupId;
        const { field, year, division } = userProfile;
        const matchesField = gid === `field_${field.replace(/\s+/g, '_')}`;
        const matchesYear = gid === `year_${field.replace(/\s+/g, '_')}_${year.replace(/\s+/g, '_')}`;
        const matchesDiv = gid === `division_${field.replace(/\s+/g, '_')}_${year.replace(/\s+/g, '_')}_${division}`;
        return matchesField || matchesYear || matchesDiv || userProfile.role === 'admin';
    };

    const isAuth = isAuthorized();

    useEffect(() => {
        if (!isAuth) return;

        const q = query(
            collection(db, 'group_messages', params.groupId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(data);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [params.groupId, isAuth]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !userProfile || !user || !isAuth) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'group_messages', params.groupId, 'messages'), {
                text: newMessage.trim(),
                senderId: user.uid,
                senderName: userProfile.name,
                senderProfileImage: userProfile.profileImage,
                timestamp: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    if (!userProfile) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!isAuth) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You are not a member of this group.</p>
                    <Link href="/groups" className="mt-6 inline-block text-indigo-600 hover:text-indigo-500 font-medium">
                        ← Back to My Groups
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col font-sans">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 p-4 shrink-0 flex items-center gap-4">
                    <Link href="/groups" className="text-gray-400 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">{humanReadableName}</h2>
                        <p className="text-xs text-gray-500 truncate">Group Chat</p>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-gray-50 border-l border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-gray-400 text-sm text-center">
                            <span className="block mb-2">👋</span>
                            Start the conversation in {humanReadableName}
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[75%] gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!isMine && (
                                            <img
                                                src={msg.senderProfileImage}
                                                alt={msg.senderName}
                                                className="w-8 h-8 rounded-full border border-gray-200 mt-1 shrink-0 bg-white"
                                            />
                                        )}
                                        <div className="flex flex-col">
                                            {!isMine && (
                                                <span className="text-xs text-gray-500 mb-1 ml-1 font-medium">{msg.senderName}</span>
                                            )}
                                            <div className={`px-4 py-2 rounded-2xl ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-900 rounded-tl-sm border border-gray-100 shadow-sm'}`}>
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                            </div>
                                            <span className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                                                {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white p-3 rounded-b-xl shadow-sm border border-gray-200 shrink-0">
                    <form className="flex gap-2" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow text-sm"
                            placeholder={`Message ${humanReadableName}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || !newMessage.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors flex shrink-0 items-center justify-center w-10 h-10 text-white"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
