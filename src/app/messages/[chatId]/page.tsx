'use client';

import { use, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { useAuth } from '@/components/AuthProvider';
import { resolveProfileImage } from '@/lib/profileImage';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { Send, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    text: string;
    senderId: string;
    gifUrl?: string;
    timestamp?: Timestamp | null;
}

interface ChatInfo {
    participants: string[];
    participantNames?: Record<string, string>;
    participantImages?: Record<string, string>;
    lastMessage?: string;
}

export default function PrivateChatDetail({ params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);

    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchChatInfo = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'private_chats', chatId));
                if (docSnap.exists()) {
                    setChatInfo(docSnap.data() as ChatInfo);
                }
            } catch (error) {
                const firebaseError = error as FirebaseError;
                if (firebaseError?.code === 'permission-denied') {
                    toast.error('You do not have permission to access this chat.');
                } else {
                    toast.error('Failed to load chat details.');
                }
            }
        };

        fetchChatInfo();

        const q = query(
            collection(db, 'private_messages', chatId, 'messages'),
            orderBy('timestamp', 'asc')
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
                        gifUrl: typeof raw.gifUrl === 'string' ? raw.gifUrl : '',
                        timestamp: raw.timestamp ?? null,
                    };
                });
                setMessages(data);
                scrollToBottom();
            },
            (error) => {
                const firebaseError = error as FirebaseError;
                if (firebaseError?.code === 'permission-denied') {
                    toast.error('You do not have permission to read messages in this chat.');
                } else {
                    toast.error('Failed to load messages.');
                }
            }
        );

        return () => unsubscribe();
    }, [chatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanMessage = newMessage.trim();
        if ((!cleanMessage && !selectedGifUrl) || !user) return;

        setLoading(true);
        try {
            setNewMessage('');
            const payload: Record<string, unknown> = {
                text: cleanMessage,
                senderId: user.uid,
                timestamp: serverTimestamp(),
            };
            if (selectedGifUrl) {
                payload.gifUrl = selectedGifUrl;
            }

            await addDoc(collection(db, 'private_messages', chatId, 'messages'), payload);

            await updateDoc(doc(db, 'private_chats', chatId), {
                lastMessage: cleanMessage || 'GIF',
                updatedAt: serverTimestamp(),
            });
            setSelectedGifUrl('');
        } catch (error) {
            const firebaseError = error as FirebaseError;
            if (firebaseError?.code === 'permission-denied') {
                toast.error('You do not have permission to send messages in this chat.');
            } else {
                toast.error('Failed to send message.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!chatInfo || !user) {
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

    const otherUserId = chatInfo.participants.find((id) => id !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'User';
    const otherImage = resolveProfileImage(chatInfo.participantImages?.[otherUserId], undefined, otherName);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col font-sans animate-[fade-in-up_0.5s_ease-out]">
                <div className="glass-strong rounded-b-none p-4 shrink-0 flex items-center gap-4">
                    <Link href="/messages" className="text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <img src={otherImage} alt={otherName} className="w-10 h-10 rounded-full border border-white/20 object-cover object-center" />
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">{otherName}</h2>
                    </div>
                </div>

                <div className="flex-1 bg-white/[0.02] border-l border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-slate-500 text-sm text-center">
                            Start the conversation with {otherName} 💬
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className="flex max-w-[75%] gap-2 flex-col">
                                        <div className={`px-4 py-2.5 rounded-2xl ${isMine ? 'bg-linear-to-r from-sky-600 to-sky-800 text-white rounded-br-sm' : 'bg-white/10 text-slate-200 rounded-bl-sm border border-white/5'}`}>
                                            {msg.gifUrl && (
                                                <img
                                                    src={msg.gifUrl}
                                                    alt="GIF"
                                                    className="w-full max-w-[260px] rounded-lg mb-2 object-cover object-center"
                                                />
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
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="glass-strong rounded-t-none border-t-0 p-3 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-start gap-3">
                            <img src={selectedGifUrl} alt="Selected GIF" className="h-16 w-16 rounded-lg object-cover object-center" />
                            <div className="flex-1">
                                <p className="text-xs text-slate-400">GIF selected</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGifUrl('')}
                                    className="mt-1 text-xs text-red-400 hover:text-red-300 font-medium"
                                >
                                    Remove GIF
                                </button>
                            </div>
                        </div>
                    )}
                    <form className="flex gap-2" onSubmit={handleSubmit}>
                        <GiphyPicker
                            disabled={loading}
                            onSelect={(gif: GiphyGif) => setSelectedGifUrl(gif.url)}
                            align="left"
                        />
                        <input
                            type="text"
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-300/30 transition-all"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="bg-linear-to-r from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-slate-900 p-2.5 rounded-full disabled:opacity-50 transition-all duration-300 flex shrink-0 items-center justify-center w-10 h-10 shadow-lg shadow-sky-300/15"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
