'use client';

import { use, useCallback, useEffect, useRef, useState, useOptimistic, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc, increment, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import ChatHeader from '@/components/ChatHeader';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import ProfilePopup from '@/components/ProfilePopup';
import dynamic from 'next/dynamic';
const VideoCall = dynamic(() => import('@/components/VideoCall'), { ssr: false });
import ChatDetailsDrawer from '@/components/ChatDetailsDrawer';
import { Lock, Search, X } from 'lucide-react';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import toast from 'react-hot-toast';
import { createNotification } from '@/lib/notifications';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import TypingIndicator from '@/components/TypingIndicator';
import MessageItem from '@/components/MessageItem';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/lib/validation/schemas';

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
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state, newMessage: Message) => {
            const index = state.findIndex(m => m.id === newMessage.id);
            if (index !== -1) {
                const newState = [...state];
                newState[index] = { ...state[index], ...newMessage };
                return newState;
            }
            return [...state, newMessage];
        }
    );
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
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    useEffect(() => {
        const fetchChatInfo = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'private_chats', chatId));
                if (docSnap.exists()) {
                    setChatInfo(docSnap.data() as ChatInfo);
                }
            } catch (error) {
                toast.error('Failed to load chat details.');
            }
        };

        fetchChatInfo();

        if (!user || !chatId) return;

        const messagesRef = collection(db, 'private_chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: Message[] = snapshot.docs.map((docSnap) => {
                const docData = docSnap.data();
                return {
                    id: docSnap.id,
                    text: docData.text || '',
                    senderId: docData.senderId || '',
                    gifUrl: docData.gifUrl || '',
                    imageUrl: docData.imageUrl || '',
                    audioUrl: docData.audioUrl || '',
                    reactions: docData.reactions || {},
                    timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate() : new Date(),
                    isEdited: docData.isEdited || false,
                    isDeleted: docData.isDeleted || false,
                    replyToId: docData.replyToId || undefined,
                };
            });
            setMessages(data);
        });

        return () => unsubscribe();
    }, [chatId, user]);

    // Clear unread count when viewing messages
    useEffect(() => {
        if (!user || !chatInfo) return;
        
        const myUnreadCount = chatInfo.unreadCount?.[user.uid] ?? 0;
        if (myUnreadCount > 0) {
            updateDoc(doc(db, 'private_chats', chatId), {
                [`unreadCount.${user.uid}`]: 0
            }).catch(() => {});
        }
    }, [chatId, user, chatInfo?.unreadCount?.[user?.uid || '']]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        if (!user) return;
        const cleanMessage = sanitiseInput(payload.text);
        if (!cleanMessage && !payload.gifUrl && !payload.imageUrl && !payload.audioUrl) return;

        const otherUid = chatInfo?.participants.find((p) => p !== user.uid);
        if (!otherUid) return;

        const optimisticMsg: Message = {
            id: 'temp-' + Date.now(),
            text: cleanMessage,
            senderId: user.uid,
            timestamp: new Date(),
            gifUrl: payload.gifUrl,
            imageUrl: payload.imageUrl,
            audioUrl: payload.audioUrl,
            replyToId: replyToMessage?.id
        };

        addOptimisticMessage(optimisticMsg);

        try {
            const messagesRef = collection(db, 'private_chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: cleanMessage,
                senderId: user.uid,
                gifUrl: payload.gifUrl || '',
                imageUrl: payload.imageUrl || '',
                audioUrl: payload.audioUrl || '',
                replyToId: replyToMessage?.id || null,
                timestamp: serverTimestamp(),
                reactions: {},
                isEdited: false,
                isDeleted: false
            });
            setReplyToMessage(null);

            await updateDoc(doc(db, 'private_chats', chatId), {
                lastMessage: cleanMessage || (payload.audioUrl ? '🎤 Voice Message' : (payload.imageUrl ? '📷 Photo' : 'GIF')),
                updatedAt: new Date(),
                [`unreadCount.${otherUid}`]: increment(1)
            });

            const senderName = chatInfo?.participantNames?.[user.uid] || 'Someone';
            const senderImage = chatInfo?.participantImages?.[user.uid];
            createNotification(otherUid, {
                type: 'message',
                title: senderName,
                body: cleanMessage || (payload.audioUrl ? '🎤 Voice Message' : (payload.imageUrl ? '📷 Photo' : '🎞 GIF')),
                link: `/messages/${chatId}`,
                senderName,
                senderImage,
            });
        } catch (error) {
            toast.error('Failed to send message');
        }
    }, [chatId, user, chatInfo, replyToMessage, addOptimisticMessage]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msg = optimisticMessages.find((m) => m.id === messageId);
        const reactions = msg?.reactions ?? {};
        const current = reactions[emoji] ?? [];
        const hasReacted = current.includes(user.uid);
        const updated = hasReacted
            ? current.filter((uid) => uid !== user.uid)
            : [...current, user.uid];

        const newReactions = { ...reactions };
        if (updated.length === 0) delete newReactions[emoji];
        else newReactions[emoji] = updated;

        addOptimisticMessage({ ...msg!, reactions: newReactions });

        const msgRef = doc(db, 'private_chats', chatId, 'messages', messageId);
        updateDoc(msgRef, { reactions: newReactions })
            .catch(() => toast.error('Failed to react.'));
    }, [optimisticMessages, user, addOptimisticMessage, chatId]);

    const handleStartEdit = useCallback((msg: Message) => {
        setEditingMessageId(msg.id);
        setEditValue(msg.text);
    }, []);

    const handleSaveEdit = useCallback(async (messageId: string) => {
        if (!editValue.trim()) return;
        try {
            const msgRef = doc(db, 'private_chats', chatId, 'messages', messageId);
            await updateDoc(msgRef, {
                text: editValue.trim(),
                isEdited: true,
            });
            setEditingMessageId(null);
            setEditValue('');
        } catch {
            toast.error('Failed to edit message.');
        }
    }, [editValue, chatId]);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditValue('');
    }, []);

    const handleDelete = useCallback(async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            const msgRef = doc(db, 'private_chats', chatId, 'messages', messageId);
            await updateDoc(msgRef, {
                text: 'This message was deleted.',
                isEdited: false,
                isDeleted: true
            });
        } catch {
            toast.error('Failed to delete message.');
        }
    }, [chatId]);

    const handleStartReply = useCallback((msg: Message) => {
        setReplyToMessage(msg);
        setEditingMessageId(null);
    }, []);

    const handleAvatarClick = useCallback((userId: string, event: React.MouseEvent) => {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
    }, []);

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return optimisticMessages;
        const lowerQ = searchQuery.toLowerCase();
        return optimisticMessages.filter(m => m.text.toLowerCase().includes(lowerQ));
    }, [optimisticMessages, searchQuery]);

    if (!user || !userProfile) return null;

    if (!chatInfo) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center">
                    <LoadingSpinner variant="full" message="Loading chat..." />
                </div>
            </DashboardLayout>
        );
    }

    const otherUserId = chatInfo.participants.find(p => p !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'Unknown User';
    const otherImage = chatInfo.participantImages?.[otherUserId] || resolveProfileImage(undefined, undefined, otherName);

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[100dvh] bg-[var(--ui-bg-base)]">
                {/* Fixed Header */}
                <div className="shrink-0 z-30">
                    <ChatHeader 
                        name={otherName} 
                        image={otherImage} 
                        type="dm" 
                        onMenuClick={() => setIsDrawerOpen(true)}
                    />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative flex flex-col min-h-0 bg-gradient-to-b from-[var(--ui-bg-base)] to-[var(--ui-bg-surface)] overflow-hidden">
                    {/* Search Bar */}
                    {isSearching && (
                        <div className="absolute top-0 left-0 right-0 p-3 bg-[var(--ui-bg-elevated)] border-b border-[var(--ui-border)] z-10 animate-[fade-in-down_0.2s_ease-out] shadow-sm flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ui-text-muted)]" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-full pl-9 pr-4 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:ring-1 focus:ring-[var(--ui-accent)] outline-none"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    setIsSearching(false);
                                    setSearchQuery('');
                                }}
                                className="p-2 text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-surface)] rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Messages stream */}
                    <Virtuoso
                        ref={virtuosoRef}
                        data={filteredMessages}
                        initialTopMostItemIndex={Math.max(0, filteredMessages.length - 1)}
                        followOutput="auto"
                        className="flex-1 overflow-x-hidden px-4"
                        itemContent={(i, msg) => {
                            const isMine = msg.senderId === user.uid;
                            const prev = i > 0 ? filteredMessages[i - 1] : null;
                            const showMsgHeader = shouldShowHeader(
                                msg.senderId,
                                prev?.senderId,
                                msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any)?.toDate?.() ?? null,
                                prev?.timestamp instanceof Date ? prev.timestamp : (prev?.timestamp as any)?.toDate?.() ?? null
                            );

                            return (
                                <MessageItem
                                    key={msg.id}
                                    msg={{
                                        ...msg,
                                        senderName: isMine ? 'You' : otherName,
                                        senderImage: isMine
                                            ? resolveProfileImage(chatInfo.participantImages?.[user.uid], undefined, 'You')
                                            : otherImage
                                    }}
                                    isMine={isMine}
                                    showMsgHeader={showMsgHeader}
                                    currentUserId={user.uid}
                                    replyToMsg={msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null}
                                    editingMessageId={editingMessageId}
                                    editValue={editingMessageId === msg.id ? editValue : undefined}
                                    setEditValue={setEditValue}
                                    onStartEdit={handleStartEdit}
                                    onSaveEdit={handleSaveEdit}
                                    onCancelEdit={handleCancelEdit}
                                    onDelete={handleDelete}
                                    onReply={handleStartReply}
                                    onReact={handleReact}
                                    onAvatarClick={handleAvatarClick}
                                />
                            );
                        }}
                        components={{
                            Header: () => (
                                <>
                                    <div className="flex justify-center mb-6 mt-4">
                                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--ui-text-muted)] font-medium tracking-wide uppercase px-3 py-1 bg-[var(--ui-bg-surface)]/50 rounded-full border border-[var(--ui-border)]/30 backdrop-blur-sm">
                                            <Lock className="w-3 h-3 shrink-0 opacity-70" />
                                            <span>End-to-end encrypted</span>
                                        </div>
                                    </div>
                                    {optimisticMessages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                            <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
                                                <img src={otherImage} alt={otherName} className="w-16 h-16 rounded-full object-cover" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[var(--ui-text)]">{otherName}</h3>
                                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the beginning of your conversation with {otherName}. Say hello! 👋</p>
                                        </div>
                                    )}
                                    {searchQuery.trim() && filteredMessages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-[var(--ui-text-muted)] py-10">
                                            <p>No messages found for &quot;{searchQuery}&quot;</p>
                                        </div>
                                    )}
                                </>
                            ),
                            Footer: () => (
                                <>
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
                                    <div className="h-4" />
                                </>
                            )
                            }}
                            />

                            {/* Input Area */}
                            <div className="shrink-0 bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent sticky bottom-0 z-20">
                            <div className="max-w-3xl mx-auto transition-all duration-300">
                            <ChatInput
                                onSend={handleSend}
                                placeholder={`Message @${otherName}`}
                                onTyping={handleTyping}
                                onStopTyping={stopTyping}
                                replyToMessage={replyToMessage}
                                onCancelReply={() => setReplyToMessage(null)}
                            />
                            </div>
                            </div>
                            </div>
            {/* Chat Details Drawer */}
            <ChatDetailsDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                otherName={otherName}
                otherImage={otherImage}
                messages={optimisticMessages}
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
