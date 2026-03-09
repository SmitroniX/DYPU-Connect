'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, limit, increment } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import ChatHeader from '@/components/ChatHeader';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import ProfilePopup from '@/components/ProfilePopup';
import dynamic from 'next/dynamic';
const VideoCall = dynamic(() => import('@/components/VideoCall'), { ssr: false });
import ChatDetailsDrawer from '@/components/ChatDetailsDrawer';
import { Lock, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { sanitiseInput, filterProfanity } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import toast from 'react-hot-toast';
import { createNotification } from '@/lib/notifications';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import TypingIndicator from '@/components/TypingIndicator';

interface Message {
    id: string;
    text: string;
    senderId: string;
    gifUrl?: string;
    imageUrl?: string;
    audioUrl?: string;
    reactions?: Record<string, string[]>;
    timestamp?: Timestamp | null;
    isEdited?: boolean;
    isDeleted?: boolean;
    replyToId?: string;
}

interface ChatInfo {
    participants: string[];
    participantNames?: Record<string, string>;
    participantImages?: Record<string, string>;
    lastMessage?: string;
    unreadCount?: Record<string, number>;
}

export default function PrivateChatDetail({ params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { user } = useAuth();
    const { userProfile } = useStore();
    const isMuted = userProfile?.mutedEntities?.includes(chatId) ?? false;

    const handleToggleMute = async () => {
        if (!user || !userProfile) return;
        const muted = new Set(userProfile.mutedEntities || []);
        if (isMuted) muted.delete(chatId);
        else muted.add(chatId);

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                mutedEntities: Array.from(muted)
            });
            toast.success(isMuted ? 'Chat unmuted' : 'Chat muted');
        } catch {
            toast.error('Failed to update mute settings');
        }
    };

    const { isPartnerTyping, handleTyping, stopTyping } = useTypingStatus(chatId);
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
            orderBy('timestamp', 'asc'),
            limit(150)
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

    // Clear unread count when viewing messages
    useEffect(() => {
        if (!user || messages.length === 0 || !chatInfo) return;
        const lastMsg = messages[messages.length - 1];
        // If the last message was from someone else, clear our unread count
        if (lastMsg.senderId !== user.uid) {
            updateDoc(doc(db, 'private_chats', chatId), {
                [`unreadCount.${user.uid}`]: 0
            }).catch(() => {});
        } else if (chatInfo.unreadCount?.[user.uid]) {
             // Also clear if we just loaded the chat and had unread messages previously
             updateDoc(doc(db, 'private_chats', chatId), {
                [`unreadCount.${user.uid}`]: 0
            }).catch(() => {});
        }
    }, [messages, messages.length, user, chatInfo, chatId]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        if (!user) return;
        const cleanMessage = sanitiseInput(payload.text);
        if (!cleanMessage && !payload.gifUrl && !payload.imageUrl && !payload.audioUrl) return;

        const msgData: Record<string, unknown> = {
            text: cleanMessage,
            senderId: user.uid,
            timestamp: serverTimestamp(),
        };
        if (payload.gifUrl) msgData.gifUrl = payload.gifUrl;
        if (payload.imageUrl) msgData.imageUrl = payload.imageUrl;
        if (payload.audioUrl) msgData.audioUrl = payload.audioUrl;
        if (replyToMessage) msgData.replyToId = replyToMessage.id;

        await addDoc(collection(db, 'private_messages', chatId, 'messages'), msgData);
        setReplyToMessage(null); // Clear reply context after sending

        const otherUid = chatInfo?.participants.find((p) => p !== user.uid);

        await updateDoc(doc(db, 'private_chats', chatId), {
            lastMessage: cleanMessage || (payload.audioUrl ? '🎤 Voice Message' : (payload.imageUrl ? '📷 Photo' : 'GIF')),
            updatedAt: serverTimestamp(),
            ...(otherUid ? { [`unreadCount.${otherUid}`]: increment(1) } : {})
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
                    body: cleanMessage || (payload.audioUrl ? '🎤 Voice Message' : (payload.imageUrl ? '📷 Photo' : '🎞 GIF')),
                    link: `/messages/${chatId}`,
                    senderName,
                    senderImage,
                });
            }
        }
    }, [chatId, user, chatInfo, replyToMessage]);

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

    const handleStartEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditValue(msg.text);
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!editValue.trim()) return;
        try {
            const msgRef = doc(db, 'private_messages', chatId, 'messages', messageId);
            await updateDoc(msgRef, {
                text: editValue.trim(),
                isEdited: true,
            });
            setEditingMessageId(null);
            setEditValue('');
        } catch {
            toast.error('Failed to edit message.');
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            const msgRef = doc(db, 'private_messages', chatId, 'messages', messageId);
            // Instead of deleting the doc entirely, we could just clear content to keep structure
            // But deleting is often preferred if we don't need placeholders.
            // Let's perform a soft delete or just replace text for now to avoid orphan reactions/replies.
            await updateDoc(msgRef, {
                text: 'This message was deleted.',
                imageUrl: null,
                gifUrl: null,
                audioUrl: null,
                isDeleted: true
            });
        } catch {
            toast.error('Failed to delete message.');
        }
    };

    const handleStartReply = (msg: Message) => {
        setReplyToMessage(msg);
        setEditingMessageId(null);
    };

    const handleAvatarClick = (userId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
    };

    if (!chatInfo || !user) {
        return (
            <DashboardLayout>
                <LoadingSpinner variant="full" message="Loading conversation…" />
            </DashboardLayout>
        );
    }

    const otherUserId = chatInfo.participants.find((id) => id !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'User';
    const otherImage = resolveProfileImage(chatInfo.participantImages?.[otherUserId], undefined, otherName);

    return (
        <DashboardLayout>
            <div className="flex h-full w-full overflow-hidden relative">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 h-full">
                    <ChatHeader 
                        chatId={chatId}
                        otherUserId={otherUserId}
                        otherName={otherName}
                        otherImage={otherImage}
                        onAvatarClick={(e) => handleAvatarClick(otherUserId, e)}
                        onActionClick={() => setIsDrawerOpen(true)}
                    >
                        <VideoCall
                            chatId={chatId}
                            myUid={user.uid}
                            otherUserId={otherUserId}
                            otherUserName={otherName}
                        />
                    </ChatHeader>

                    {/* Search Bar */}
                    {isSearching && (
                        <div className="flex items-center px-4 py-3 bg-[var(--ui-bg-surface)] border-b border-[var(--ui-border)]/50 shrink-0 z-10 animate-[fade-in-down_0.2s_ease-out]">
                            <Search className="w-4 h-4 text-[var(--ui-text-muted)] mr-3 shrink-0" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search in this chat..."
                                className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)]"
                                autoFocus
                            />
                            <button 
                                onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
                                className="p-1.5 ml-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded-full hover:bg-[var(--ui-bg-hover)] transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Messages stream */}
                    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {/* E2EE Notice */}
                    <div className="flex justify-center mb-6 mt-2">
                        <div className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 max-w-[300px] text-center shadow-sm ring-1 ring-[var(--ui-accent)]/20 animate-[fade-in-up_0.4s_ease-out]">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span className="leading-tight">Messages are end-to-end encrypted. No one outside of this chat, not even DYPU Connect, can read them.</span>
                        </div>
                    </div>

                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
                                <img src={otherImage} alt={otherName} className="w-16 h-16 rounded-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">{otherName}</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the beginning of your conversation with {otherName}. Say hello! 👋</p>
                        </div>
                    ) : (
                        (() => {
                            const filteredMessages = searchQuery.trim() 
                                ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
                                : messages;

                            if (searchQuery.trim() && filteredMessages.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--ui-text-muted)] mt-10">
                                        <p>No messages found for &quot;{searchQuery}&quot;</p>
                                    </div>
                                );
                            }

                            return filteredMessages.map((msg, i) => {
                                const isMine = msg.senderId === user.uid;
                                const senderName = isMine ? 'You' : otherName;
                                const senderImage = isMine
                                    ? resolveProfileImage(chatInfo.participantImages?.[user.uid], undefined, 'You')
                                    : otherImage;
                                const prev = i > 0 ? filteredMessages[i - 1] : null;
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
                                    className={`group relative flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${showMsgHeader ? 'mt-6' : 'mt-1'} animate-[fade-in-up_0.3s_ease-out]`}
                                >
                                    <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                        
                                        {/* Avatar Column */}
                                        <div className="w-8 shrink-0 flex flex-col items-center justify-end pb-1">
                                            {(!prev || prev.senderId !== msg.senderId) && !isMine && (
                                                <img
                                                    src={senderImage}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover cursor-pointer shadow-sm ring-1 ring-[var(--ui-border)] hover:ring-[var(--ui-accent)]/50 transition-all"
                                                    onClick={(e) => handleAvatarClick(msg.senderId, e)}
                                                />
                                            )}
                                        </div>

                                        {/* Message bubble container */}
                                        <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                            {/* Hover Toolbar - floats outside the bubble */}
                                            <div className={`absolute top-0 -mt-8 z-10 ${isMine ? 'right-0' : 'left-0'}`}>
                                                <MessageHoverToolbar onReact={(emoji) => handleReact(msg.id, emoji)} />
                                            </div>
                                            
                                            {/* Header row (name) */}
                                            {showMsgHeader && !isMine && (
                                                <div className="flex items-baseline gap-2 mb-1 ml-1 pl-1">
                                                    <span
                                                        className="font-semibold text-[13px] text-[var(--ui-text)] cursor-pointer hover:underline"
                                                        onClick={(e) => handleAvatarClick(msg.senderId, e)}
                                                    >
                                                        {senderName}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Actual Bubble */}
                                            <div
                                                className={`
                                                    relative px-3 py-2 shadow-sm flex flex-col min-w-[75px]
                                                    ${isMine 
                                                        ? 'bg-gradient-to-br from-[var(--ui-accent)] to-[#4f46e5] text-white rounded-2xl rounded-br-sm' 
                                                        : 'bg-[var(--ui-bg-surface)] text-[var(--ui-text)] rounded-2xl rounded-bl-sm border border-[var(--ui-border)]/50'}
                                                `}
                                            >
                                                {/* Reply snippet inside the bubble */}
                                                {msg.replyToId && (
                                                    <div className={`mb-2 pl-2 border-l-2 rounded-sm text-[12px] opacity-80 cursor-pointer ${isMine ? 'border-white/50 bg-white/10 p-1.5' : 'border-[var(--ui-accent)] bg-[var(--ui-accent)]/5 p-1.5'}`}>
                                                        <div className="font-semibold">{messages.find(m => m.id === msg.replyToId)?.senderId === user.uid ? 'You' : otherName}</div>
                                                        <div className="truncate max-w-[200px]">
                                                            {messages.find(m => m.id === msg.replyToId)?.text || 'Attachment'}
                                                        </div>
                                                    </div>
                                                )}
                                                {msg.gifUrl && (
                                                    <img src={msg.gifUrl} alt="GIF" className="max-w-full sm:max-w-[280px] rounded-xl mb-1 object-cover" />
                                                )}
                                                {msg.imageUrl && (
                                                    <img src={msg.imageUrl} alt="Photo" className={`max-w-full sm:max-w-[280px] rounded-xl mb-1 object-cover ${!isMine && 'border border-[var(--ui-border)]/50'}`} />
                                                )}
                                                {msg.audioUrl && (
                                                    <div className="mb-1">
                                                        <audio src={msg.audioUrl} controls className={`h-10 w-full sm:w-48 rounded-md ${isMine ? 'opacity-90' : 'opacity-100'}`} />
                                                    </div>
                                                )}
                                                {editingMessageId === msg.id ? (
                                                    <div className="flex flex-col w-full min-w-[200px] mt-1 z-20 relative">
                                                        <input
                                                            autoFocus
                                                            className={`bg-transparent border-b ${isMine ? 'border-white/40 text-white' : 'border-[var(--ui-border)] text-[var(--ui-text)]'} focus:outline-none pb-1`}
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveEdit(msg.id);
                                                                if (e.key === 'Escape') setEditingMessageId(null);
                                                            }}
                                                        />
                                                        <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-[var(--ui-text-muted)]'}`}>
                                                            Esc to cancel, Enter to save
                                                        </div>
                                                    </div>
                                                ) : msg.text && (
                                                    <p className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${isMine ? 'text-white/95' : 'text-[var(--ui-text-secondary)]'} ${msg.text.length < 20 ? 'pr-12' : 'pb-3.5'} ${msg.isDeleted ? 'italic opacity-60' : ''}`}>
                                                        {renderMarkdown(filterProfanity(msg.text))}
                                                        {msg.isEdited && !msg.isDeleted && <span className="text-[10px] ml-1 opacity-60">(edited)</span>}
                                                    </p>
                                                )}

                                                {/* Timestamp & Read Receipt */}
                                                <div className={`absolute bottom-1 right-2 flex items-center gap-0.5 text-[10px] ${isMine ? 'text-white/80' : 'text-[var(--ui-text-muted)]'}`}>
                                                    <span>{ts ? format(ts, 'HH:mm') : '...'}</span>
                                                    {isMine && (
                                                        <svg className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="m18 6-11 11-5-5"></path>
                                                            <path d="m22 10-7.5 7.5L13 16"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reactions underneath the bubble directly */}
                                            <div className={`mt-0.5 ${isMine ? 'pr-1' : 'pl-1'}`}>
                                                <MessageReactions
                                                    messageRef={msgRef}
                                                    reactions={msg.reactions ?? {}}
                                                    currentUserId={user.uid}
                                                />
                                               {/* Hover Toolbar for reactions, edit, delete, etc */}
                                            {(!msg.text || msg.text !== 'This message was deleted.') && (
                                                <MessageHoverToolbar
                                                    onReact={(emoji) => handleReact(msg.id, emoji)}
                                                    isMine={isMine}
                                                    onEdit={() => handleStartEdit(msg)}
                                                    onDelete={() => handleDelete(msg.id)}
                                                    onReply={() => handleStartReply(msg)}
                                                />
                                            )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                        })()
                    )}
                    {isPartnerTyping && (
                        <div className="flex w-full justify-start mt-2 mb-2 animate-[fade-in-up_0.2s_ease-out]">
                            <div className="flex gap-3 max-w-[85%] sm:max-w-[70%] flex-row">
                                <div className="w-8 shrink-0 flex flex-col items-center justify-end pb-1">
                                    <img
                                        src={otherImage}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-[var(--ui-border)]"
                                    />
                                </div>
                                <div className="relative flex flex-col items-start">
                                  <TypingIndicator />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>

                <ChatInput
                    onSend={handleSend}
                    placeholder={`Message @${otherName}`}
                    onTyping={handleTyping}
                    onStopTyping={stopTyping}
                />
            </div>

            {/* Chat Details Drawer */}
            <ChatDetailsDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                otherName={otherName}
                otherImage={otherImage}
                messages={messages}
                onSearchClick={() => {
                    setIsDrawerOpen(false);
                    setIsSearching(true);
                }}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
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
