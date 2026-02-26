'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { Send, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { generateAnonymousName } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    text: string;
    anonymousName: string;
    gifUrl?: string;
    timestamp?: Timestamp | null;
    sessionId?: string;
    senderId?: string; // Backward compatibility for older messages
}

export default function AnonymousChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Track this session's anonymous identity. To keep it consistent across a session.
    const [sessionIdentity, setSessionIdentity] = useState('');
    const [sessionId, setSessionId] = useState('');

    useEffect(() => {
        if (!sessionIdentity) {
            setSessionIdentity(generateAnonymousName());
        }
    }, [sessionIdentity]);

    useEffect(() => {
        if (!sessionId) {
            setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
        }
    }, [sessionId]);

    useEffect(() => {
        const q = query(
            collection(db, 'anonymous_public_chat'),
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
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanMessage = newMessage.trim();
        if ((!cleanMessage && !selectedGifUrl) || !userProfile || !user) return;

        setLoading(true);
        try {
            // 1. Create Public Doc
            const docRef = await addDoc(collection(db, 'anonymous_public_chat'), {
                text: cleanMessage,
                gifUrl: selectedGifUrl || null,
                anonymousName: sessionIdentity,
                timestamp: serverTimestamp(),
                sessionId // For local UX alignment only, without exposing real user identity
            });

            // 2. Map to Private Doc
            await setDoc(doc(db, 'anonymous_public_chat_private', docRef.id), {
                messageId: docRef.id,
                userId: user.uid,
                email: user.email,
                text: cleanMessage,
                gifUrl: selectedGifUrl || null,
                sessionId,
                timestamp: serverTimestamp(),
            });

            setNewMessage('');
            setSelectedGifUrl('');
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col font-sans">
                <div className="mb-4 shrink-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <EyeOff className="h-6 w-6 text-purple-600" />
                            Shadow Realm
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Anonymous public chat. Admins have oversight.
                        </p>
                    </div>
                    <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium border border-purple-200">
                        You are: {sessionIdentity || 'Connecting...'}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-gray-900 rounded-t-xl shadow-sm border border-gray-800 overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-gray-500 text-sm">Silence in the shadow realm. Speak up.</div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.sessionId === sessionId || (!!msg.senderId && msg.senderId === user?.uid);
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[75%] gap-2 flex-col`}>
                                        {!isMine && (
                                            <span className="text-xs text-purple-400 font-mono mb-1">{msg.anonymousName}</span>
                                        )}
                                        <div className={`px-4 py-2 rounded-2xl ${isMine ? 'bg-purple-600 text-purple-50 rounded-tr-sm' : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700'}`}>
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
                                        <span className={`text-[10px] text-gray-500 mt-1 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                                            {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-gray-800 p-3 rounded-b-xl shadow-sm shrink-0 border-t-0">
                    {selectedGifUrl && (
                        <div className="mb-3 rounded-lg border border-gray-600 bg-gray-700 p-2 flex items-start gap-3">
                            <img src={selectedGifUrl} alt="Selected GIF" className="h-16 w-16 rounded object-cover object-center" />
                            <div className="flex-1">
                                <p className="text-xs text-gray-200">GIF selected</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGifUrl('')}
                                    className="mt-1 text-xs text-red-300 hover:text-red-200 font-medium"
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
                            className="flex-1 bg-gray-700 text-white border-none rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow placeholder-gray-400"
                            placeholder={`Send message as ${sessionIdentity}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors flex shrink-0 items-center justify-center w-10 h-10"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
