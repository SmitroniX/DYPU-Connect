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
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const otherUserId = chatInfo.participants.find((id) => id !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'User';
    const otherImage = resolveProfileImage(chatInfo.participantImages?.[otherUserId], undefined, otherName);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col font-sans">
                <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 p-4 shrink-0 flex items-center gap-4">
                    <Link href="/messages" className="text-gray-400 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <img src={otherImage} alt={otherName} className="w-10 h-10 rounded-full border border-gray-100 object-cover object-center" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{otherName}</h2>
                    </div>
                </div>

                <div className="flex-1 bg-gray-50 border-l border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-gray-400 text-sm text-center">
                            Start the conversation with {otherName}
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className="flex max-w-[75%] gap-2 flex-col">
                                        <div className={`px-4 py-2 rounded-2xl ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100 shadow-sm'}`}>
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
                                        <span className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                                            {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-white p-3 rounded-b-xl shadow-sm border border-gray-200 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2 flex items-start gap-3">
                            <img src={selectedGifUrl} alt="Selected GIF" className="h-16 w-16 rounded object-cover object-center" />
                            <div className="flex-1">
                                <p className="text-xs text-gray-600">GIF selected</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGifUrl('')}
                                    className="mt-1 text-xs text-red-600 hover:text-red-700 font-medium"
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
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow text-sm"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors flex shrink-0 items-center justify-center w-10 h-10"
                        >
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
