'use client';

import { useState, useEffect, useRef, useCallback, useOptimistic } from 'react';
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
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { listPublicMessagesRef, sendPublicMessage, updatePublicMessage } from '@/generated/dataconnect';
import { subscribe } from 'firebase/data-connect';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/lib/validation/schemas';

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
    
    const { user } = useAuth();
    const { userProfile } = useStore();
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    useEffect(() => {
        const now = new Date();
        const unsubscribe = subscribe(
            listPublicMessagesRef({ now: now.toISOString() }),
            (result) => {
                const data: Message[] = result.data.publicMessages.map((pm) => ({
                    id: pm.id,
                    text: pm.messageContent,
                    senderId: pm.senderStudentId,
                    senderName: pm.senderStudentId === user?.uid ? userProfile?.name : (pm.sender ? `${pm.sender.firstName} ${pm.sender.lastName}` : 'User'),
                    senderImage: pm.senderStudentId === user?.uid ? userProfile?.profileImage : (pm.sender?.profilePictureUrl ?? ''),
                    gifUrl: pm.gifUrl ?? '',
                    imageUrl: pm.imageUrl ?? '',
                    audioUrl: pm.audioUrl ?? '',
                    reactions: (pm.reactions as Record<string, string[]>) ?? {},
                    timestamp: pm.sentAt ? new Date(pm.sentAt) : null,
                    isEdited: pm.isEdited ?? false,
                    isDeleted: pm.isDeleted ?? false,
                    expiresAt: pm.expiresAt ? new Date(pm.expiresAt) : null,
                }));
                setMessages(data);
            }
        );
        return () => unsubscribe();
    }, [user, userProfile]);

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
        };

        addOptimisticMessage(optimisticMsg);

        try {
            await sendPublicMessage({
                senderId: user.uid,
                messageContent: cleanMessage,
                gifUrl: payload.gifUrl,
                imageUrl: payload.imageUrl,
                audioUrl: payload.audioUrl,
                expiresAt: expireDate.toISOString(),
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to send message');
        }
    }, [user, userProfile, addOptimisticMessage]);

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

        updatePublicMessage({ id: messageId, reactions: newReactions })
            .catch(() => toast.error('Failed to react.'));
    }, [optimisticMessages, user, addOptimisticMessage]);

    const handleStartEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditValue(msg.text);
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!editValue.trim()) return;
        try {
            await updatePublicMessage({
                id: messageId,
                messageContent: editValue.trim(),
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
            await updatePublicMessage({
                id: messageId,
                messageContent: 'This message was deleted.',
                isEdited: false,
                isDeleted: true
            });
        } catch {
            toast.error('Failed to delete message.');
        }
    };

    const handleAvatarClick = (userId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setProfilePopup({ userId, rect });
    };

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disablePublicChat" moduleName="Public Chat">
            <div className="h-full flex flex-col">
                <ChannelHeader name="campus-plaza" description="Real-time public chat for everyone at DYPU">
                    <Users className="h-4 w-4 text-[var(--ui-text-muted)]" />
                </ChannelHeader>

                <Virtuoso
                    ref={virtuosoRef}
                    data={optimisticMessages}
                    initialTopMostItemIndex={Math.max(0, optimisticMessages.length - 1)}
                    followOutput="auto"
                    className="flex-1 overflow-x-hidden px-4"
                    itemContent={(i, msg) => {
                        const isMine = msg.senderId === user?.uid;
                        const prev = i > 0 ? optimisticMessages[i - 1] : null;
                        const showMsgHeader = shouldShowHeader(
                            msg.senderId,
                            prev?.senderId,
                            msg.timestamp ?? null,
                            prev?.timestamp ?? null
                        );

                        return (
                            <MessageItem
                                key={msg.id}
                                msg={msg}
                                isMine={isMine}
                                showMsgHeader={showMsgHeader}
                                currentUserId={user?.uid ?? ''}
                                editingMessageId={editingMessageId}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onStartEdit={handleStartEdit}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={() => setEditingMessageId(null)}
                                onDelete={handleDelete}
                                onReact={handleReact}
                                onAvatarClick={handleAvatarClick}
                            />
                        );
                    }}
                    components={{
                        Header: () => (
                            <>
                                {optimisticMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                        <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                            <Users className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #campus-plaza!</h3>
                                        <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the start of the channel. Say hello! 👋</p>
                                    </div>
                                )}
                            </>
                        ),
                        Footer: () => <div className="h-4" />
                    }}
                />

                <ChatInput
                    onSend={handleSend}
                    placeholder="Message #campus-plaza"
                />

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
