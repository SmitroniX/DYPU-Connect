'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
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
import { sanitiseInput } from '@/lib/security';
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
        const cleanMessage = sanitiseInput(newMessage);
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
            <div className="h-full flex flex-col">
                <ChannelHeader name="shadow-realm" description="Anonymous public chat — admins have oversight">
                    <span className="badge text-[var(--ui-accent)]">
                        <EyeOff className="h-3 w-3" />
                        {sessionIdentity || 'Connecting...'}
                    </span>
                </ChannelHeader>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                <EyeOff className="h-8 w-8 text-[var(--ui-text-muted)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #shadow-realm!</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">Silence in the shadows. Speak up. 👁️</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMine = msg.sessionId === sessionId || (!!msg.senderId && msg.senderId === user?.uid);
                            const prev = i > 0 ? messages[i - 1] : null;
                            const showHeader = !prev || prev.anonymousName !== msg.anonymousName;
                            const ts = msg.timestamp?.toDate?.();

                            return (
                                <div key={msg.id} className={`message-row group ${showHeader ? 'mt-4' : 'mt-0'}`}>
                                    <div className="flex gap-4">
                                        <div className="w-10 shrink-0 flex items-start pt-0.5">
                                            {showHeader ? (
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isMine ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)]' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)]'}`}>
                                                    {msg.anonymousName.charAt(0)}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity w-full text-center pt-1">
                                                    {ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {showHeader && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span className={`font-medium text-[15px] ${isMine ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'}`}>
                                                        {msg.anonymousName}
                                                        {isMine && <span className="text-xs text-[var(--ui-text-muted)] ml-1">(you)</span>}
                                                    </span>
                                                    <span className="text-xs text-[var(--ui-text-muted)]">
                                                        {ts ? formatDistanceToNow(ts, { addSuffix: true }) : 'Sending...'}
                                                    </span>
                                                </div>
                                            )}
                                            {msg.gifUrl && (
                                                <img src={msg.gifUrl} alt="GIF" className="max-w-[300px] rounded-lg mt-1 object-cover" />
                                            )}
                                            {msg.text && (
                                                <p className="text-[15px] text-[var(--ui-text-secondary)] leading-relaxed break-words whitespace-pre-wrap">
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

                {/* Typing area */}
                <div className="h-6 px-4 flex items-center" />

                {/* Discord-style input */}
                <div className="px-4 pb-4 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-2 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] p-2 flex items-center gap-3">
                            <img src={selectedGifUrl} alt="GIF" className="h-14 w-14 rounded object-cover" />
                            <div className="flex-1"><p className="text-xs text-[var(--ui-text-muted)]">GIF attached</p></div>
                            <button onClick={() => setSelectedGifUrl('')} className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <form className="flex items-center gap-0 bg-[var(--ui-bg-input)] rounded-lg" onSubmit={handleSubmit}>
                        <div className="flex items-center pl-3 gap-1 shrink-0">
                            <GiphyPicker disabled={loading} onSelect={(gif: GiphyGif) => setSelectedGifUrl(gif.url)} align="left" />
                        </div>
                        <input
                            type="text"
                            className="input bg-transparent"
                            placeholder={`Message as ${sessionIdentity}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!newMessage.trim() && !selectedGifUrl)}
                            className="p-2.5 pr-3 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] disabled:opacity-30 transition-colors shrink-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
