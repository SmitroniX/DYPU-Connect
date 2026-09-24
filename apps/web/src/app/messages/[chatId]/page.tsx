'use client';

import { use, useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { Lock, Search, X, Sparkles, ChevronDown } from 'lucide-react';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import toast from 'react-hot-toast';
import { createNotification } from '@/lib/notifications';
import { ChatMessageListSkeleton, Skeleton } from '@/components/Skeleton';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import TypingIndicator from '@/components/TypingIndicator';
import MessageItem from '@/components/MessageItem';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/lib/validation/schemas';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInfo {
    participants: string[];
    participantNames?: Record<string, string>;
    participantImages?: Record<string, string>;
    lastMessage?: string;
    unreadCount?: Record<string, number>;
}

const SAY_HELLO_CHIPS = [
    '👋 Hey there!',
    '📚 Are you free to study?',
    '☕ Coffee at the cafeteria?',
    '📝 Notes from today\'s lecture?'
];

export default function PrivateChatDetail({ params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);

    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
    const [chatError, setChatError] = useState<string | null>(null);
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAtBottom, setIsAtBottom] = useState(true);

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
        let isMounted = true;
        const fetchChatInfo = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'private_chats', chatId));
                if (isMounted) {
                    if (docSnap.exists()) {
                        setChatInfo(docSnap.data() as ChatInfo);
                    } else {
                        setChatError('Chat not found');
                        setIsLoading(false);
                    }
                }
            } catch {
                if (isMounted) {
                    setChatError('Failed to load chat details.');
                    setIsLoading(false);
                }
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
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            if (isMounted) {
                if (error.code === 'failed-precondition') {
                    toast.error('Chat index is building. Please wait a minute and refresh.');
                } else if (error.code === 'permission-denied') {
                    setChatError('Permission denied');
                }
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
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
    }, [chatId, user, chatInfo]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        if (!user) return;
        const cleanMessage = sanitiseInput(payload.text);
        if (!cleanMessage && !payload.gifUrl && !payload.imageUrl && !payload.audioUrl) return;

        const otherUid = chatInfo?.participants.find((p) => p !== user.uid);
        if (!otherUid) return;

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
            
            if (replyToMessage) {
                setReplyToMessage(null);
            }

            await updateDoc(doc(db, 'private_chats', chatId), {
                lastMessage: cleanMessage || (payload.audioUrl ? '🎤 Voice Message' : (payload.imageUrl ? '📷 Photo' : 'GIF')),
                updatedAt: serverTimestamp(),
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
        } catch {
            toast.error('Failed to send message');
        }
    }, [chatId, user, chatInfo, replyToMessage]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
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

        const msgRef = doc(db, 'private_chats', chatId, 'messages', messageId);
        updateDoc(msgRef, { reactions: newReactions })
            .catch(() => toast.error('Failed to react.'));
    }, [messages, user, chatId]);

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
        if (!searchQuery.trim()) return messages;
        const lowerQ = searchQuery.toLowerCase();
        return messages.filter(m => m.text.toLowerCase().includes(lowerQ));
    }, [messages, searchQuery]);

    const scrollToBottom = () => {
        virtuosoRef.current?.scrollToIndex({
            index: filteredMessages.length - 1,
            align: 'end',
            behavior: 'smooth'
        });
    };

    if (!user || !userProfile) return null;

    if (chatError) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--ui-text)] mb-2">{chatError}</h2>
                    <p className="text-[var(--ui-text-muted)] max-w-sm">
                        {chatError === 'Permission denied' 
                            ? "You don't have access to this conversation, or it has been deleted."
                            : "There was a problem loading this conversation."}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (!chatInfo) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full bg-[var(--ui-bg-base)]">
                    <div className="h-16 border-b border-[var(--ui-border)] px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[var(--ui-bg-surface)]">
                        <div className="flex items-center gap-3">
                            <Skeleton variant="circle" className="w-10 h-10" />
                            <div className="space-y-1.5">
                                <Skeleton variant="text" className="h-4 w-32" />
                                <Skeleton variant="text" className="h-3 w-20" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        <ChatMessageListSkeleton count={6} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const otherUserId = chatInfo.participants.find(p => p !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'Unknown User';
    const otherImage = chatInfo.participantImages?.[otherUserId] || resolveProfileImage(undefined, undefined, otherName);

    return (
        <DashboardLayout>
            {/* Fluid full-height messaging container without mobile keyboard jitter */}
            <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-[var(--ui-bg-base)] overflow-hidden overscroll-none select-text">
                {/* Header Integration with ChatHeader */}
                <div className="shrink-0 z-30">
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
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative flex flex-col min-h-0 bg-gradient-to-b from-[var(--ui-bg-base)] to-[var(--ui-bg-surface)] overflow-hidden">
                    {/* Search Bar */}
                    {isSearching && (
                        <div className="absolute top-0 left-0 right-0 p-3 bg-[var(--ui-bg-elevated)] border-b border-[var(--ui-border)] z-20 animate-[fade-in-down_0.2s_ease-out] shadow-sm flex items-center gap-2">
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
                                className="p-2 text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-surface)] rounded-full transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Messages stream */}
                    {isLoading ? (
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <ChatMessageListSkeleton count={6} />
                        </div>
                    ) : (
                        <div className="flex-1 relative flex flex-col min-h-0">
                            <Virtuoso
                                ref={virtuosoRef}
                                data={filteredMessages}
                                initialTopMostItemIndex={Math.max(0, filteredMessages.length - 1)}
                                followOutput="smooth"
                                atBottomStateChange={(bottom) => setIsAtBottom(bottom)}
                                className="flex-1 overflow-x-hidden px-4"
                                itemContent={(i, msg) => {
                                    const isMine = msg.senderId === user.uid;
                                    const prev = i > 0 ? filteredMessages[i - 1] : null;
                                    const showMsgHeader = shouldShowHeader(
                                        msg.senderId,
                                        prev?.senderId,
                                        msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as { toDate?: () => Date })?.toDate?.() ?? null,
                                        prev?.timestamp instanceof Date ? prev.timestamp : (prev?.timestamp as { toDate?: () => Date })?.toDate?.() ?? null
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
                                            {/* Empty chat state with illustrated avatar & "Say hello" prompt chips */}
                                            {messages.length === 0 && (
                                                <div className="flex flex-col items-center justify-center text-center py-10 px-4 animate-[fade-in_0.3s_ease-out]">
                                                    <div className="relative mb-4">
                                                        <div className="w-20 h-20 rounded-full p-1 ring-4 ring-[var(--ui-accent)]/20 bg-gradient-to-br from-[var(--ui-accent)]/10 to-purple-500/10 flex items-center justify-center shadow-xl">
                                                            <img 
                                                                src={otherImage} 
                                                                alt={otherName} 
                                                                className="w-full h-full rounded-full object-cover" 
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--ui-accent)] text-white flex items-center justify-center shadow-md">
                                                            <Sparkles className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                    <h3 className="text-xl font-extrabold text-[var(--ui-text)] tracking-tight">{otherName}</h3>
                                                    <p className="text-xs text-[var(--ui-text-muted)] mt-1 max-w-xs font-medium">
                                                        This is the start of your direct conversation with {otherName}. Send a message or pick an icebreaker below!
                                                    </p>

                                                    {/* "Say hello" prompt chips */}
                                                    <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-sm">
                                                        {SAY_HELLO_CHIPS.map((chip) => (
                                                            <button
                                                                key={chip}
                                                                onClick={() => handleSend({ text: chip })}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[var(--ui-bg-surface)] hover:bg-[var(--ui-bg-hover)] active:scale-95 text-[var(--ui-text)] border border-[var(--ui-border)] shadow-xs transition-all cursor-pointer hover:border-[var(--ui-accent)]/50"
                                                            >
                                                                <span>{chip}</span>
                                                            </button>
                                                        ))}
                                                    </div>
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

                            {/* Floating Jump to Bottom Button */}
                            <AnimatePresence>
                                {!isAtBottom && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8, y: 16 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 16 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                        onClick={scrollToBottom}
                                        className="absolute bottom-4 right-6 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--ui-bg-surface)]/90 hover:bg-[var(--ui-bg-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] shadow-xl backdrop-blur-xl transition-all cursor-pointer group"
                                        aria-label="Jump to bottom"
                                    >
                                        <ChevronDown className="w-4 h-4 text-[var(--ui-accent)] group-hover:translate-y-0.5 transition-transform" />
                                        <span className="text-xs font-semibold">Latest</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="shrink-0 bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent sticky bottom-0 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
                    messages={messages}
                    onSearchClick={() => {
                        setIsDrawerOpen(false);
                        setIsSearching(true);
                    }}
                    isMuted={isMuted}
                    onToggleMute={handleToggleMute}
                    chatId={chatId}
                    user={user}
                    otherUserId={otherUserId}
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
