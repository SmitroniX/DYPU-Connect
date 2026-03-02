'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import ProfilePopup from '@/components/ProfilePopup';
import { resolveProfileImage } from '@/lib/profileImage';
import { sanitiseInput, filterProfanity } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderProfileImage: string;
    gifUrl?: string;
    imageUrl?: string;
    reactions?: Record<string, string[]>;
    timestamp?: Timestamp | null;
}

export default function PublicChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);
    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'public_chat'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
                setMessages(data);
                scrollToBottom();
            },
            (error) => {
                console.error('Public chat listener error:', error);
            }
        );
        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        const cleanMessage = sanitiseInput(payload.text);
        if ((!cleanMessage && !payload.gifUrl && !payload.imageUrl) || !userProfile || !user) return;

        const msgPayload: Record<string, unknown> = {
            text: cleanMessage,
            senderId: user.uid,
            senderName: userProfile.name,
            senderProfileImage: userProfile.profileImage,
            timestamp: serverTimestamp(),
        };
        if (payload.gifUrl) msgPayload.gifUrl = payload.gifUrl;
        if (payload.imageUrl) msgPayload.imageUrl = payload.imageUrl;
        await addDoc(collection(db, 'public_chat'), msgPayload);
    }, [user, userProfile]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msgRef = doc(db, 'public_chat', messageId);
        const msg = messages.find((m) => m.id === messageId);
        const reactions = msg?.reactions ?? {};
        const current = reactions[emoji] ?? [];
        const hasReacted = current.includes(user.uid);
        const updated = hasReacted ? current.filter((uid) => uid !== user.uid) : [...current, user.uid];
        const newReactions = { ...reactions };
        if (updated.length === 0) delete newReactions[emoji];
        else newReactions[emoji] = updated;
        updateDoc(msgRef, { reactions: newReactions }).catch(() => toast.error('Failed to react.'));
    }, [messages, user]);

    const handleAvatarClick = (userId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
    };

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name="campus-plaza" description="Real-time public chat for everyone at DYPU">
                    <Users className="h-4 w-4 text-[var(--ui-text-muted)]" />
                </ChannelHeader>

                {/* Messages stream (Discord-style flat layout) */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-[var(--ui-text-muted)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #campus-plaza!</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the start of the channel. Say hello! 👋</p>
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
                            const msgRef = doc(db, 'public_chat', msg.id);

                            return (
                                <div
                                    key={msg.id}
                                    className={`message-row group relative ${showHeader ? 'mt-4' : 'mt-0'}`}
                                >
                                    <MessageHoverToolbar onReact={(emoji) => handleReact(msg.id, emoji)} />

                                    <div className="flex gap-4">
                                        <div className="w-10 shrink-0 flex items-start pt-0.5">
                                            {showHeader ? (
                                                <img
                                                    src={resolveProfileImage(msg.senderProfileImage, undefined, msg.senderName)}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[var(--ui-accent)]/40 transition-all"
                                                    onClick={(e) => handleAvatarClick(msg.senderId, e)}
                                                />
                                            ) : (
                                                <span className="text-[10px] text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity w-full text-center pt-1">
                                                    {ts ? format(ts, 'HH:mm') : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {showHeader && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span
                                                        className="font-medium text-[var(--ui-text)] text-[15px] hover:underline cursor-pointer"
                                                        onClick={(e) => handleAvatarClick(msg.senderId, e)}
                                                    >
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
                                            {msg.imageUrl && (
                                                <img src={msg.imageUrl} alt="Photo" className="max-w-[300px] rounded-lg mt-1 object-cover border border-[var(--ui-border)]" />
                                            )}
                                            {msg.text && (
                                                <p className="text-[15px] text-[var(--ui-text-secondary)] leading-relaxed break-words whitespace-pre-wrap">
                                                    {filterProfanity(msg.text)}
                                                </p>
                                            )}
                                            <MessageReactions
                                                messageRef={msgRef}
                                                reactions={msg.reactions ?? {}}
                                                currentUserId={user?.uid ?? ''}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat input */}
                <ChatInput
                    onSend={handleSend}
                    placeholder="Message #campus-plaza"
                />

                {/* Profile popup */}
                {profilePopup && (
                    <ProfilePopup
                        userId={profilePopup.userId}
                        anchorRect={profilePopup.rect}
                        onClose={() => setProfilePopup(null)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
