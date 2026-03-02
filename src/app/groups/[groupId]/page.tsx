'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import ChannelHeader from '@/components/ChannelHeader';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import ProfilePopup from '@/components/ProfilePopup';
import { ArrowLeft, Users, ShieldAlert } from 'lucide-react';
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
    imageUrl?: string;
    reactions?: Record<string, string[]>;
    timestamp?: Timestamp | null;
}

export default function GroupChatDetail({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);

    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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
                    const raw = docSnap.data();
                    return {
                        id: docSnap.id,
                        text: raw.text ?? '',
                        senderId: raw.senderId ?? '',
                        senderName: raw.senderName ?? 'User',
                        senderProfileImage: raw.senderProfileImage ?? '',
                        gifUrl: typeof raw.gifUrl === 'string' ? raw.gifUrl : '',
                        imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
                        reactions: raw.reactions ?? {},
                        timestamp: raw.timestamp ?? null,
                    };
                });
                setMessages(data);
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

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        const cleanMessage = sanitiseInput(payload.text);
        if ((!cleanMessage && !payload.gifUrl && !payload.imageUrl) || !userProfile || !user || !isAuth) return;

        const msgData: Record<string, unknown> = {
            text: cleanMessage,
            senderId: user.uid,
            senderName: userProfile.name,
            senderProfileImage: userProfile.profileImage,
            timestamp: serverTimestamp(),
        };
        if (payload.gifUrl) msgData.gifUrl = payload.gifUrl;
        if (payload.imageUrl) msgData.imageUrl = payload.imageUrl;

        await addDoc(collection(db, 'group_messages', groupId, 'messages'), msgData);
    }, [groupId, user, userProfile, isAuth]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msgRef = doc(db, 'group_messages', groupId, 'messages', messageId);
        const msg = messages.find((m) => m.id === messageId);
        const reactions = msg?.reactions ?? {};
        const current = reactions[emoji] ?? [];
        const hasReacted = current.includes(user.uid);
        const updated = hasReacted ? current.filter((uid) => uid !== user.uid) : [...current, user.uid];
        const newReactions = { ...reactions };
        if (updated.length === 0) delete newReactions[emoji];
        else newReactions[emoji] = updated;
        updateDoc(msgRef, { reactions: newReactions }).catch(() => toast.error('Failed to react.'));
    }, [groupId, messages, user]);

    const handleAvatarClick = (userId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
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
                        <ShieldAlert className="h-8 w-8 text-[var(--ui-danger)]" />
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
                            const msgRef = doc(db, 'group_messages', groupId, 'messages', msg.id);

                            return (
                                <div
                                    key={msg.id}
                                    className={`message-row group relative ${showMsgHeader ? 'mt-4' : 'mt-0'}`}
                                >
                                    <MessageHoverToolbar onReact={(emoji) => handleReact(msg.id, emoji)} />

                                    <div className="flex gap-4">
                                        <div className="w-10 shrink-0 flex items-start pt-0.5">
                                            {showMsgHeader ? (
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
                                            {showMsgHeader && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span
                                                        className={`font-medium text-[15px] cursor-pointer hover:underline ${isMine ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'}`}
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
                                                    {msg.text}
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

                <ChatInput
                    onSend={handleSend}
                    placeholder={`Message #${humanReadableName}`}
                />

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
