'use client';

import { useState, useEffect, useRef, useCallback, useOptimistic, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
import ChannelHeader from '@/components/ChannelHeader';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import ProfilePopup from '@/components/ProfilePopup';
import MessageItem from '@/components/MessageItem';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import { Users, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, rtdb } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, limit } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { ChatMessageListSkeleton } from '@/components/Skeleton';
import { Message } from '@/lib/validation/schemas';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function PublicChatPage() {
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
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [onlineCount, setOnlineCount] = useState<number>(1);
    
    const { user } = useAuth();
    const { userProfile } = useStore();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const prevCountRef = useRef(0);

    // Track online participants count
    useEffect(() => {
        if (!rtdb) return;
        try {
            const statusRef = ref(rtdb, '/status');
            const unsubscribe = onValue(statusRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    let count = 0;
                    if (data && typeof data === 'object') {
                        Object.values(data).forEach((userVal: unknown) => {
                            if (typeof userVal === 'object' && userVal !== null && (userVal as { state?: string }).state === 'online') {
                                count++;
                            }
                        });
                    }
                    setOnlineCount(Math.max(1, count));
                }
            });
            return () => unsubscribe();
        } catch {
            // fallback gracefully
        }
    }, []);

    // Listen to public messages
    useEffect(() => {
        const messagesRef = collection(db, 'public_chat');
        const simplerQ = query(messagesRef, orderBy('timestamp', 'asc'), limit(200));

        const unsubscribe = onSnapshot(simplerQ, (snapshot) => {
            const now = new Date();
            const data: Message[] = [];
            
            snapshot.forEach((docSnap) => {
                const pm = docSnap.data();
                const expiresAt = pm.expiresAt?.toDate ? pm.expiresAt.toDate() : null;
                
                // Filter out expired messages
                if (expiresAt && expiresAt < now) return;

                data.push({
                    id: docSnap.id,
                    text: pm.text || '',
                    senderId: pm.senderId || '',
                    senderName: pm.senderName || 'User',
                    senderImage: pm.senderImage || '',
                    gifUrl: pm.gifUrl || '',
                    imageUrl: pm.imageUrl || '',
                    audioUrl: pm.audioUrl || '',
                    reactions: pm.reactions || {},
                    timestamp: pm.timestamp?.toDate ? pm.timestamp.toDate() : new Date(),
                    isEdited: pm.isEdited || false,
                    isDeleted: pm.isDeleted || false,
                    expiresAt: expiresAt,
                    replyToId: pm.replyToId || undefined,
                });
            });
            setMessages(data);
            setLoading(false);
        }, (error) => {
            console.error('Failed to subscribe to public chat:', error);
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, [user, userProfile]);

    // Unread count tracking when scrolled up
    useEffect(() => {
        if (!isAtBottom && optimisticMessages.length > prevCountRef.current) {
            const diff = optimisticMessages.length - prevCountRef.current;
            setUnreadCount(prev => prev + diff);
        }
        prevCountRef.current = optimisticMessages.length;
    }, [optimisticMessages.length, isAtBottom]);

    const handleJumpToBottom = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({
            index: optimisticMessages.length - 1,
            align: 'end',
            behavior: 'smooth'
        });
        setUnreadCount(0);
    }, [optimisticMessages.length]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        const cleanMessage = sanitiseInput(payload.text);
        if ((!cleanMessage && !payload.gifUrl && !payload.imageUrl && !payload.audioUrl) || !userProfile || !user) return;

        const expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + 48);

        const optimisticMsg: Message = {
            id: 'temp-' + Date.now(),
            text: cleanMessage,
            senderId: user.uid,
            senderName: userProfile.name,
            senderImage: userProfile.profileImage,
            timestamp: new Date(),
            gifUrl: payload.gifUrl,
            imageUrl: payload.imageUrl,
            audioUrl: payload.audioUrl,
            expiresAt: expireDate,
            replyToId: replyToMessage?.id,
        };

        addOptimisticMessage(optimisticMsg);

        try {
            const messagesRef = collection(db, 'public_chat');
            await addDoc(messagesRef, {
                text: cleanMessage,
                senderId: user.uid,
                senderName: userProfile.name,
                senderImage: userProfile.profileImage,
                gifUrl: payload.gifUrl || '',
                imageUrl: payload.imageUrl || '',
                audioUrl: payload.audioUrl || '',
                replyToId: replyToMessage?.id || null,
                timestamp: serverTimestamp(),
                expiresAt: expireDate,
                reactions: {},
                isEdited: false,
                isDeleted: false
            });
            
            setReplyToMessage(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to send message');
        }
    }, [user, userProfile, addOptimisticMessage, replyToMessage]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msg = optimisticMessages.find((m) => m.id === messageId);
        if (!msg) return;
        const reactions = msg.reactions ?? {};
        const current = reactions[emoji] ?? [];
        const hasReacted = current.includes(user.uid);
        const updated = hasReacted ? current.filter((uid) => uid !== user.uid) : [...current, user.uid];
        const newReactions = { ...reactions };
        if (updated.length === 0) delete newReactions[emoji];
        else newReactions[emoji] = updated;

        addOptimisticMessage({ ...msg, reactions: newReactions });

        const msgRef = doc(db, 'public_chat', messageId);
        updateDoc(msgRef, { reactions: newReactions })
            .catch(() => toast.error('Failed to react.'));
    }, [optimisticMessages, user, addOptimisticMessage]);

    const handleStartEdit = useCallback((msg: Message) => {
        setEditingMessageId(msg.id);
        setEditValue(msg.text);
    }, []);

    const handleSaveEdit = useCallback(async (messageId: string) => {
        if (!editValue.trim()) return;
        try {
            const msgRef = doc(db, 'public_chat', messageId);
            await updateDoc(msgRef, {
                text: editValue.trim(),
                isEdited: true,
            });
            setEditingMessageId(null);
            setEditValue('');
        } catch {
            toast.error('Failed to edit message.');
        }
    }, [editValue]);

    const handleDelete = useCallback(async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            const msgRef = doc(db, 'public_chat', messageId);
            await updateDoc(msgRef, {
                text: 'This message was deleted.',
                isEdited: false,
                isDeleted: true
            });
        } catch {
            toast.error('Failed to delete message.');
        }
    }, []);

    const handleStartReply = useCallback((msg: Message) => {
        setReplyToMessage(msg);
        setEditingMessageId(null);
    }, []);

    const handleAvatarClick = useCallback((userId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
    }, []);

    const messageMap = useMemo(() => {
        const map = new Map<string, Message>();
        optimisticMessages.forEach((msg) => map.set(msg.id, msg));
        return map;
    }, [optimisticMessages]);

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disablePublicChat" moduleName="Public Chat">
            <div className="h-full flex flex-col bg-[var(--ui-bg-base)]">
                {/* Modern Chat Header with Live Online Participant Count Pill */}
                <ChannelHeader name="campus-plaza" description="Real-time public chat for everyone at DYPU">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 backdrop-blur-md shadow-xs select-none">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span>{onlineCount} {onlineCount === 1 ? 'student' : 'students'} online</span>
                    </div>
                </ChannelHeader>

                {/* Message stream with smooth skeleton loading state */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 overflow-y-auto px-4 py-4"
                        >
                            <ChatMessageListSkeleton count={6} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat-stream"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex-1 relative flex flex-col min-h-0 overflow-hidden"
                        >
                            <Virtuoso
                                ref={virtuosoRef}
                                data={optimisticMessages}
                                initialTopMostItemIndex={Math.max(0, optimisticMessages.length - 1)}
                                followOutput="auto"
                                atBottomStateChange={(bottom) => {
                                    setIsAtBottom(bottom);
                                    if (bottom) {
                                        setUnreadCount(0);
                                    }
                                }}
                                className="flex-1 overflow-x-hidden px-4"
                                itemContent={(i, msg) => {
                                    const isMine = msg.senderId === user?.uid;
                                    const prev = i > 0 ? optimisticMessages[i - 1] : null;
                                    
                                    const msgDate = msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as { toDate?: () => Date })?.toDate?.() ?? new Date();
                                    const prevDate = prev ? (prev.timestamp instanceof Date ? prev.timestamp : (prev.timestamp as { toDate?: () => Date })?.toDate?.() ?? null) : null;
                                    const isDifferentDay = !prevDate || !isSameDay(msgDate, prevDate);

                                    let dateLabel = format(msgDate, 'MMMM d, yyyy');
                                    if (isToday(msgDate)) dateLabel = 'Today';
                                    else if (isYesterday(msgDate)) dateLabel = 'Yesterday';

                                    const showMsgHeader = shouldShowHeader(
                                        msg.senderId,
                                        prev?.senderId,
                                        msgDate,
                                        prevDate
                                    );

                                    return (
                                        <div key={msg.id}>
                                            {/* Sticky Date Separator with Glassmorphic Badge Styling */}
                                            {isDifferentDay && (
                                                <div className="sticky top-2 z-10 flex justify-center my-3 pointer-events-none">
                                                    <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--ui-bg-surface)]/80 backdrop-blur-xl border border-[var(--ui-border)]/70 text-[var(--ui-text-muted)] shadow-xs select-none">
                                                        {dateLabel}
                                                    </span>
                                                </div>
                                            )}
                                            <MessageItem
                                                msg={msg}
                                                isMine={isMine}
                                                showMsgHeader={showMsgHeader}
                                                currentUserId={user?.uid ?? ''}
                                                replyToMsg={msg.replyToId ? messageMap.get(msg.replyToId) : null}
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
                                        </div>
                                    );
                                }}
                                components={{
                                    Header: () => (
                                        <>
                                            {optimisticMessages.length === 0 && (
                                                <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-[fade-in-up_0.5s_ease-out]">
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--ui-accent)] to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-[var(--ui-accent)]/20">
                                                        <Users className="h-10 w-10 text-white" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Welcome to Campus Plaza</h3>
                                                    <p className="text-[var(--ui-text-muted)] max-w-sm">
                                                        This is a public space for everyone at DYPU. Messages here automatically disappear after 48 hours.
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ),
                                    Footer: () => <div className="h-4" />
                                }}
                            />

                            {/* Floating 'Jump to Bottom' scroll button with unread count badge & smooth spring */}
                            <AnimatePresence>
                                {!isAtBottom && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8, y: 16 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 16 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                        onClick={handleJumpToBottom}
                                        className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--ui-bg-surface)]/90 hover:bg-[var(--ui-bg-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] shadow-xl backdrop-blur-xl transition-all cursor-pointer group select-none"
                                        aria-label="Jump to bottom"
                                    >
                                        <ChevronDown className="w-4 h-4 text-[var(--ui-accent)] group-hover:translate-y-0.5 transition-transform" />
                                        <span className="text-xs font-bold">Latest</span>
                                        {unreadCount > 0 && (
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold rounded-full bg-[var(--ui-accent)] text-white shadow-xs">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sticky input area */}
                <div className="shrink-0 bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent sticky bottom-0 z-20">
                    <div className="max-w-3xl mx-auto transition-all duration-300">
                        <div className="px-4 pb-1 flex justify-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-xs select-none">
                                📢 Campus Plaza • Public broadcast to all students (48h auto-expire)
                            </span>
                        </div>
                        <ChatInput
                            onSend={handleSend}
                            placeholder="Message everyone in Campus Plaza..."
                            replyToMessage={replyToMessage}
                            onCancelReply={() => setReplyToMessage(null)}
                        />
                    </div>
                </div>

                {profilePopup && (
                    <ProfilePopup
                        userId={profilePopup.userId}
                        anchorRect={profilePopup.rect}
                        onClose={() => setProfilePopup(null)}
                    />
                )}
            </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
