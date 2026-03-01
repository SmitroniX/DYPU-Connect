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
import ChannelHeader from '@/components/ChannelHeader';
import GiphyPicker from '@/components/GiphyPicker';
import type { GiphyGif } from '@/lib/giphy';
import { Send, ArrowLeft, Users, X, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
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
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--ui-accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--ui-accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--ui-accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!isAuth) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                        <ShieldAlert className="h-8 w-8 text-[var(--dc-dnd)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--ui-text)] mb-2">Access Denied</h2>
                    <p className="text-sm text-[var(--ui-text-muted)]">You are not a member of this group.</p>
                    <Link href="/groups" className="mt-4 text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] font-medium transition-colors text-sm">
                        ← Back to My Groups
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name={humanReadableName} description="Group Chat">
                    <Link href="/groups" className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <Users className="h-4 w-4 text-[var(--ui-text-muted)]" />
                </ChannelHeader>

                {/* Messages stream (Discord flat layout) */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-[var(--ui-text-muted)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #{humanReadableName}!</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the start of the group. Say hello! 👋</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMine = msg.senderId === user?.uid;
                            const prev = i > 0 ? messages[i - 1] : null;
                            const showMsgHeader = shouldShowHeader(
                                msg.senderId,
                                prev?.senderId,
                                msg.timestamp?.toDate?.() ?? null,
                                prev?.timestamp?.toDate?.() ?? null
                            );
                            const ts = msg.timestamp?.toDate?.();

                            return (
                                <div
                                    key={msg.id}
                                    className={`dc-message group ${showMsgHeader ? 'mt-4' : 'mt-0'}`}
                                >
                                    <div className="flex gap-4">
                                        {/* Avatar or timestamp spacer */}
                                        <div className="w-10 shrink-0 flex items-start pt-0.5">
                                            {showMsgHeader ? (
                                                <img
                                                    src={resolveProfileImage(msg.senderProfileImage, undefined, msg.senderName)}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[10px] text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity w-full text-center pt-1">
                                                    {ts ? format(ts, 'HH:mm') : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {showMsgHeader && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span className={`font-medium text-[15px] ${isMine ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'} hover:underline cursor-pointer`}>
                                                        {msg.senderName}
                                                    </span>
                                                    <span className="text-xs text-[var(--ui-text-muted)]">
                                                        {ts ? format(ts, 'dd/MM/yyyy HH:mm') : 'Sending...'}
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

                {/* Typing indicator area */}
                <div className="h-6 px-4 flex items-center" />

                {/* Discord-style input bar */}
                <div className="px-4 pb-4 shrink-0">
                    {selectedGifUrl && (
                        <div className="mb-2 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] p-2 flex items-center gap-3">
                            <img src={selectedGifUrl} alt="GIF" className="h-14 w-14 rounded object-cover" />
                            <div className="flex-1">
                                <p className="text-xs text-[var(--ui-text-muted)]">GIF attached</p>
                            </div>
                            <button onClick={() => setSelectedGifUrl('')} className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--dc-dnd)]">
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
                            placeholder={`Message #${humanReadableName}`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            autoFocus
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
