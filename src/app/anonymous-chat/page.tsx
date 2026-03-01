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
import { Send, EyeOff, X } from 'lucide-react';
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
    senderId?: string;
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
            <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col font-sans animate-[fade-in-up_0.5s_ease-out]">
                <div className="mb-4 shrink-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                            <EyeOff className="h-7 w-7 text-sky-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            <span style={{ textShadow: '0 0 20px rgba(168,85,247,0.3)' }}>Shadow Realm</span>
                        </h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Anonymous public chat. Admins have oversight.
                        </p>
                    </div>
                    <div className="bg-sky-400/10 text-sky-200 px-3 py-1.5 rounded-full text-xs font-medium border border-sky-300/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                        You are: {sessionIdentity || 'Connecting...'}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-[#0a0e1a]/50 backdrop-blur-md border border-sky-300/10 rounded-t-2xl shadow-[inset_0_0_30px_rgba(125,211,252,0.03)] overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-slate-500 text-sm">Silence in the shadow realm. Speak up. 👁️</div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.sessionId === sessionId || (!!msg.senderId && msg.senderId === user?.uid);
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className="flex max-w-[75%] gap-2 flex-col">
                                        {!isMine && (
                                            <span className="text-xs text-sky-300/80 font-mono mb-1">{msg.anonymousName}</span>
                                        )}
                                        <div className={`px-4 py-2.5 rounded-2xl ${isMine ? 'bg-sky-600 text-white rounded-tr-sm shadow-lg shadow-sky-300/20' : 'bg-white/5 text-slate-200 rounded-tl-sm border border-sky-300/10'}`}>
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

                {/* Input Area */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-sky-300/10 rounded-b-2xl border-t-0 p-3 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-3 rounded-xl border border-sky-300/20 bg-white/5 p-2.5 flex items-start gap-3">
                            <img src={selectedGifUrl} alt="Selected GIF" className="h-16 w-16 rounded-lg object-cover object-center" />
                            <div className="flex-1">
                                <p className="text-xs text-slate-400">GIF selected</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGifUrl('')}
                                    className="mt-1 text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Remove
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
                            className="flex-1 bg-white/5 border border-sky-300/20 text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300/30 transition-all placeholder-slate-500"
                            placeholder={`Send message as ${sessionIdentity}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="bg-sky-600 text-white p-2.5 rounded-full hover:bg-sky-400 disabled:opacity-50 transition-all duration-300 flex shrink-0 items-center justify-center w-10 h-10 shadow-lg shadow-sky-300/25"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
