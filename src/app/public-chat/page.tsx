'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { resolveProfileImage } from '@/lib/profileImage';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import { PlusCircle, Send, X, Users } from 'lucide-react';
import { format } from 'date-fns';

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
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
            setMessages(data);
            scrollToBottom();
        });
        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

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
            if (selectedGifUrl) payload.gifUrl = selectedGifUrl;
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
            <div className="h-full flex flex-col">
                <ChannelHeader name="campus-plaza" description="Real-time public chat for everyone at DYPU">
                    <Users className="h-4 w-4 text-[var(--dc-text-muted)]" />
                </ChannelHeader>

                {/* Messages stream (Discord-style flat layout) */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--dc-bg-tertiary)] flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-[var(--dc-text-muted)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--dc-text-primary)]">Welcome to #campus-plaza!</h3>
                            <p className="text-sm text-[var(--dc-text-muted)] mt-1">This is the start of the channel. Say hello! 👋</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const prev = i > 0 ? messages[i - 1] : null;
                            const showHeader = shouldShowHeader(
                                msg.senderId,
                                prev?.senderId,
                                msg.timestamp?.toDate?.() ?? null,
                                prev?.timestamp?.toDate?.() ?? null
                            );
                            const ts = msg.timestamp?.toDate?.();

                            return (
                                <div
                                    key={msg.id}
                                    className={`dc-message group ${showHeader ? 'mt-4' : 'mt-0'}`}
                                >
                                    <div className="flex gap-4">
                                        {/* Avatar or spacer */}
                                        <div className="w-10 shrink-0 flex items-start pt-0.5">
                                            {showHeader ? (
                                                <img
                                                    src={resolveProfileImage(msg.senderProfileImage, undefined, msg.senderName)}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[10px] text-[var(--dc-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity w-full text-center pt-1">
                                                    {ts ? format(ts, 'HH:mm') : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {showHeader && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span className="font-medium text-[var(--dc-text-primary)] text-[15px] hover:underline cursor-pointer">
                                                        {msg.senderName}
                                                    </span>
                                                    <span className="text-xs text-[var(--dc-text-muted)]">
                                                        {ts ? format(ts, 'dd/MM/yyyy HH:mm') : 'Sending...'}
                                                    </span>
                                                </div>
                                            )}
                                            {msg.gifUrl && (
                                                <img src={msg.gifUrl} alt="GIF" className="max-w-[300px] rounded-lg mt-1 object-cover" />
                                            )}
                                            {msg.text && (
                                                <p className="text-[15px] text-[var(--dc-text-secondary)] leading-relaxed break-words whitespace-pre-wrap">
                                                    {msg.text}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator area */}
                <div className="h-6 px-4 flex items-center">
                    {/* Placeholder for future typing indicators */}
                </div>

                {/* Discord-style input bar */}
                <div className="px-4 pb-4 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-2 rounded-lg bg-[var(--dc-bg-secondary)] border border-[var(--dc-border)] p-2 flex items-center gap-3">
                            <img src={selectedGifUrl} alt="GIF" className="h-14 w-14 rounded object-cover" />
                            <div className="flex-1">
                                <p className="text-xs text-[var(--dc-text-muted)]">GIF attached</p>
                            </div>
                            <button onClick={() => setSelectedGifUrl('')} className="p-1 text-[var(--dc-text-muted)] hover:text-[var(--dc-dnd)]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <form className="flex items-center gap-0 bg-[var(--dc-bg-input)] rounded-lg" onSubmit={handleSubmit}>
                        <div className="flex items-center pl-3 gap-1 shrink-0">
                            <GiphyPicker
                                disabled={loading}
                                onSelect={(gif: GiphyGif) => setSelectedGifUrl(gif.url)}
                                align="left"
                            />
                            <PlusCircle className="h-5 w-5 text-[var(--dc-text-muted)] hover:text-[var(--dc-text-primary)] cursor-pointer transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="dc-input bg-transparent"
                            placeholder="Message #campus-plaza"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="p-2.5 pr-3 text-[var(--dc-text-muted)] hover:text-[var(--dc-accent)] disabled:opacity-30 transition-colors shrink-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
