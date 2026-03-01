'use client';

import { use, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { Send, ArrowLeft, Users, X, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sanitiseInput } from '@/lib/security';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderProfileImage: string;
    gifUrl?: string;
    timestamp?: Timestamp | null;
}

export default function GroupChatDetail({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const humanReadableName = (() => {
        try {
            return decodeURIComponent(groupId)
                .replace(/^field_|^year_|^division_/, '')
                .replace(/_/g, ' ');
        } catch {
            return groupId.replace(/_/g, ' ');
        }
    })();

    const isAuthorized = () => {
        if (!userProfile) return false;

        const { field, year, division } = userProfile;
        const matchesField = groupId === `field_${field.replace(/\s+/g, '_')}`;
        const matchesYear = groupId === `year_${field.replace(/\s+/g, '_')}_${year.replace(/\s+/g, '_')}`;
        const matchesDiv = groupId === `division_${field.replace(/\s+/g, '_')}_${year.replace(/\s+/g, '_')}_${division}`;

        return matchesField || matchesYear || matchesDiv || userProfile.role === 'admin';
    };

    const isAuth = isAuthorized();

    useEffect(() => {
        if (!isAuth) return;

        const q = query(
            collection(db, 'group_messages', groupId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: Message[] = snapshot.docs.map((docSnap) => {
                    const raw = docSnap.data() as Partial<Message>;
                    return {
                        id: docSnap.id,
                        text: raw.text ?? '',
                        senderId: raw.senderId ?? '',
                        senderName: raw.senderName ?? 'User',
                        senderProfileImage: raw.senderProfileImage ?? '',
                        timestamp: raw.timestamp ?? null,
                    };
                });

                setMessages(data);
                scrollToBottom();
            },
            (error) => {
                const firebaseError = error as FirebaseError;
                if (firebaseError?.code === 'permission-denied') {
                    toast.error('You do not have permission to read this group chat.');
                    return;
                }
                toast.error('Failed to load group chat.');
            }
        );

        return () => unsubscribe();
    }, [groupId, isAuth]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanMessage = sanitiseInput(newMessage);
        if ((!cleanMessage && !selectedGifUrl) || !userProfile || !user || !isAuth) return;

        setLoading(true);
        try {
            const payload: Record<string, unknown> = {
                text: cleanMessage,
                senderId: user.uid,
                senderName: userProfile.name,
                senderProfileImage: userProfile.profileImage,
                timestamp: serverTimestamp(),
            };
            if (selectedGifUrl) {
                payload.gifUrl = selectedGifUrl;
            }

            await addDoc(collection(db, 'group_messages', groupId, 'messages'), payload);
            setNewMessage('');
            setSelectedGifUrl('');
        } catch (error) {
            const firebaseError = error as FirebaseError;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('You do not have permission to send messages in this group.');
            } else {
                toast.error('Failed to send message');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!userProfile) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
                    <div className="flex gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-200 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!isAuth) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-12 text-center">
                    <ShieldAlert className="mx-auto h-12 w-12 text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400">You are not a member of this group.</p>
                    <Link href="/groups" className="mt-6 inline-block text-sky-300 hover:text-sky-200 font-medium transition-colors">
                        ← Back to My Groups
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col font-sans animate-[fade-in-up_0.5s_ease-out]">
                {/* Header */}
                <div className="glass-strong rounded-b-none p-4 shrink-0 flex items-center gap-4">
                    <Link href="/groups" className="text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-sky-300/15 flex items-center justify-center text-sky-300 shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-white leading-tight truncate">{humanReadableName}</h2>
                        <p className="text-xs text-slate-500 truncate">Group Chat</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 bg-white/[0.02] border-l border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-slate-500 text-sm text-center">
                            Start the conversation in {humanReadableName} 💬
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[75%] gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!isMine && (
                                            <img
                                                src={resolveProfileImage(msg.senderProfileImage, undefined, msg.senderName)}
                                                alt={msg.senderName}
                                                className="w-8 h-8 rounded-full border border-white/20 mt-1 shrink-0 object-cover object-center"
                                            />
                                        )}
                                        <div className="flex flex-col">
                                            {!isMine && (
                                                <span className="text-xs text-slate-500 mb-1 ml-1 font-medium">{msg.senderName}</span>
                                            )}
                                            <div className={`px-4 py-2.5 rounded-2xl ${isMine ? 'bg-linear-to-r from-sky-500 to-sky-700 text-white rounded-tr-sm' : 'bg-white/10 text-slate-200 rounded-tl-sm border border-white/5'}`}>
                                                {msg.gifUrl && (
                                                    <img src={msg.gifUrl} alt="GIF" className="w-full max-w-[260px] rounded-lg mb-2 object-cover object-center" />
                                                )}
                                                {msg.text && (
                                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                                )}
                                            </div>
                                            <span className={`text-[10px] text-slate-600 mt-1 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
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

                {/* Input */}
                <div className="glass-strong rounded-t-none border-t-0 p-3 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-start gap-3">
                            <img src={selectedGifUrl} alt="Selected GIF" className="h-16 w-16 rounded-lg object-cover object-center" />
                            <div className="flex-1">
                                <p className="text-xs text-slate-400">GIF selected</p>
                                <button type="button" onClick={() => setSelectedGifUrl('')} className="mt-1 text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1">
                                    <X className="w-3 h-3" /> Remove
                                </button>
                            </div>
                        </div>
                    )}
                    <form className="flex gap-2" onSubmit={handleSubmit}>
                        <GiphyPicker disabled={loading} onSelect={(gif: GiphyGif) => setSelectedGifUrl(gif.url)} align="left" />
                        <input
                            type="text"
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all"
                            placeholder={`Message ${humanReadableName}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="bg-linear-to-r from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white p-2.5 rounded-full disabled:opacity-50 transition-all duration-300 flex shrink-0 items-center justify-center w-10 h-10 shadow-lg shadow-sky-300/20"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
