'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { useAuth } from '@/components/AuthProvider';
import { resolveProfileImage } from '@/lib/profileImage';
import ChannelHeader from '@/components/ChannelHeader';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import ProfilePopup from '@/components/ProfilePopup';
import VideoCall from '@/components/VideoCall';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createNotification } from '@/lib/notifications';

interface Message {
    id: string;
    text: string;
    senderId: string;
    gifUrl?: string;
    imageUrl?: string;
    reactions?: Record<string, string[]>;
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
    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);

    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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
                    const raw = docSnap.data();
                    return {
                        id: docSnap.id,
                        text: raw.text ?? '',
                        senderId: raw.senderId ?? '',
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
                    toast.error('You do not have permission to read messages in this chat.');
                } else {
                    toast.error('Failed to load messages.');
                }
            }
        );

        return () => unsubscribe();
    }, [chatId]);


    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        if (!user) return;
        const cleanMessage = sanitiseInput(payload.text);
        if (!cleanMessage && !payload.gifUrl && !payload.imageUrl) return;

        const msgData: Record<string, unknown> = {
            text: cleanMessage,
            senderId: user.uid,
            timestamp: serverTimestamp(),
        };
        if (payload.gifUrl) msgData.gifUrl = payload.gifUrl;
        if (payload.imageUrl) msgData.imageUrl = payload.imageUrl;

        await addDoc(collection(db, 'private_messages', chatId, 'messages'), msgData);
        await updateDoc(doc(db, 'private_chats', chatId), {
            lastMessage: cleanMessage || (payload.imageUrl ? '📷 Photo' : 'GIF'),
            updatedAt: serverTimestamp(),
        });

        // Fire-and-forget: notify the other participant
        if (chatInfo) {
            const otherUid = chatInfo.participants.find((p) => p !== user.uid);
            if (otherUid) {
                const senderName = chatInfo.participantNames?.[user.uid] || 'Someone';
                const senderImage = chatInfo.participantImages?.[user.uid];
                createNotification(otherUid, {
                    type: 'message',
                    title: senderName,
                    body: cleanMessage || (payload.imageUrl ? '📷 Photo' : '🎞 GIF'),
                    link: `/messages/${chatId}`,
                    senderName,
                    senderImage,
                });
            }
        }
    }, [chatId, user, chatInfo]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msgRef = doc(db, 'private_messages', chatId, 'messages', messageId);
        const msg = messages.find((m) => m.id === messageId);
        const reactions = msg?.reactions ?? {};
        const current = reactions[emoji] ?? [];
        const hasReacted = current.includes(user.uid);
        const updated = hasReacted
            ? current.filter((uid) => uid !== user.uid)
            : [...current, user.uid];

        const newReactions = { ...reactions };
        if (updated.length === 0) delete newReactions[emoji];
        else newReactions[emoji] = updated;

        updateDoc(msgRef, { reactions: newReactions }).catch(() => toast.error('Failed to react.'));
    }, [chatId, messages, user]);

    const handleAvatarClick = (userId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
    };

    if (!chatInfo || !user) {
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

    const otherUserId = chatInfo.participants.find((id) => id !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'User';
    const otherImage = resolveProfileImage(chatInfo.participantImages?.[otherUserId], undefined, otherName);

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <ChannelHeader name={otherName} description="Direct Message" type="dm">
                    <Link href="/messages" className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <VideoCall
                        chatId={chatId}
                        myUid={user.uid}
                        otherUserId={otherUserId}
                        otherUserName={otherName}
                    />
                </ChannelHeader>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
                                <img src={otherImage} alt={otherName} className="w-16 h-16 rounded-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">{otherName}</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the beginning of your conversation with {otherName}. Say hello! 👋</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMine = msg.senderId === user.uid;
                            const senderName = isMine ? 'You' : otherName;
                            const senderImage = isMine
                                ? resolveProfileImage(chatInfo.participantImages?.[user.uid], undefined, 'You')
                                : otherImage;
                            const prev = i > 0 ? messages[i - 1] : null;
                            const showMsgHeader = shouldShowHeader(
                                msg.senderId,
                                prev?.senderId,
                                msg.timestamp?.toDate?.() ?? null,
                                prev?.timestamp?.toDate?.() ?? null
                            );
                            const ts = msg.timestamp?.toDate?.();
                            const msgRef = doc(db, 'private_messages', chatId, 'messages', msg.id);

                            return (
                                <div
                                    key={msg.id}
                                    className={`message-row group relative ${showMsgHeader ? 'mt-4' : 'mt-0'}`}
                                >
                                    <MessageHoverToolbar
                                        onReact={(emoji) => handleReact(msg.id, emoji)}
                                    />

                                    <div className="flex gap-4">
                                        <div className="w-10 shrink-0 flex items-start pt-0.5">
                                            {showMsgHeader ? (
                                                <img
                                                    src={senderImage}
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
                                                        {senderName}
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
                                                    {renderMarkdown(msg.text)}
                                                </p>
                                            )}
                                            <MessageReactions
                                                messageRef={msgRef}
                                                reactions={msg.reactions ?? {}}
                                                currentUserId={user.uid}
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
                    placeholder={`Message @${otherName}`}
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

/* Simple markdown renderer */
function renderMarkdown(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    const patterns = [
        { regex: /\*\*(.+?)\*\*/g, render: (m: string) => <strong key={key++} className="font-bold text-[var(--ui-text)]">{m}</strong> },
        { regex: /\*(.+?)\*/g, render: (m: string) => <em key={key++} className="italic">{m}</em> },
        { regex: /`(.+?)`/g, render: (m: string) => <code key={key++} className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-elevated)] text-[var(--ui-accent)] text-[13px] font-mono">{m}</code> },
    ];

    for (const { regex, render } of patterns) {
        if (typeof remaining !== 'string') { parts.push(remaining); return parts; }
        const newParts: React.ReactNode[] = [];
        let lastIndex = 0;
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(remaining)) !== null) {
            if (match.index > lastIndex) newParts.push(remaining.slice(lastIndex, match.index));
            newParts.push(render(match[1]));
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < remaining.length) newParts.push(remaining.slice(lastIndex));
        if (newParts.some((n) => typeof n !== 'string')) return newParts;
        remaining = newParts.join('');
    }
    return remaining || text;
}
