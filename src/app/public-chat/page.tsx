'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { resolveProfileImage } from '@/lib/profileImage';
import { sanitiseInput } from '@/lib/security';
import { Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderProfileImage: string;
    gifUrl?: string;
    timestamp?: Timestamp | null;
}

export default function PublicChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedGifUrl, setSelectedGifUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'public_chat'),
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
        const cleanMessage = sanitiseInput(newMessage);
        if ((!cleanMessage && !selectedGifUrl) || !userProfile || !user) return;

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

            await addDoc(collection(db, 'public_chat'), { ...payload });
            setNewMessage('');
            setSelectedGifUrl('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col font-sans animate-[fade-in-up_0.5s_ease-out]">
                <div className="mb-4 shrink-0">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                        🏛️ Campus Plaza
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Real-time public chat for everyone at DYPU.
                    </p>
                </div>

                {/* Chat Area */}
                <div className="flex-1 glass overflow-y-auto p-4 flex flex-col gap-4 rounded-b-none">
                    {messages.length === 0 ? (
                        <div className="m-auto text-slate-500 text-sm">No messages yet. Say hello! 👋</div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.senderId === user?.uid;
                            const displayName = msg.senderName || 'Student';
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
                                            <span className={`text-xs text-slate-500 mb-1 ${isMine ? 'mr-1 text-right' : 'ml-1'}`}>
                                                {isMine ? `You (${displayName})` : displayName}
                                            </span>
                                            <div className={`px-4 py-2.5 rounded-2xl ${isMine ? 'bg-linear-to-r from-sky-600 to-sky-800 text-white rounded-tr-sm' : 'bg-white/10 text-slate-200 rounded-tl-sm border border-white/5'}`}>
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
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="glass-strong rounded-t-none border-t-0 p-3 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-start gap-3">
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
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300/30 transition-all"
                            placeholder="Message Campus Plaza..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="bg-sky-500 hover:bg-sky-400 text-white p-2.5 rounded-full disabled:opacity-50 transition-all duration-300 flex shrink-0 items-center justify-center w-10 h-10 shadow-lg shadow-sky-300/20"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
