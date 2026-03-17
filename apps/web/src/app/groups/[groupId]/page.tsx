'use client';

import { use, useCallback, useEffect, useRef, useState, useOptimistic } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { Group } from '@/types/groups';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import ChannelHeader from '@/components/ChannelHeader';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import ProfilePopup from '@/components/ProfilePopup';
import GroupDetailsDrawer from '@/components/GroupDetailsDrawer';
import { ArrowLeft, Users, ShieldAlert, MoreVertical, Search, X } from 'lucide-react';
import { sanitiseInput } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, remove } from 'firebase/database';
import ModuleGuard from '@/components/ModuleGuard';
import MessageItem from '@/components/MessageItem';
import { listGroupMessagesRef, sendGroupMessage, updateGroupMessage } from '@/generated/dataconnect';
import { subscribe } from 'firebase/data-connect';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/lib/validation/schemas';

export default function GroupChatDetail({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
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
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [group, setGroup] = useState<Group | null>(null);
    const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; name: string }>>([]);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const { user } = useAuth();
    const { userProfile } = useStore();
    const isMuted = userProfile?.mutedEntities?.includes(groupId) ?? false;

    const handleToggleMute = async () => {
        if (!user || !userProfile) return;
        const muted = new Set(userProfile.mutedEntities || []);
        if (isMuted) muted.delete(groupId);
        else muted.add(groupId);

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                mutedEntities: Array.from(muted)
            });
            toast.success(isMuted ? 'Group unmuted' : 'Group muted');
        } catch {
            toast.error('Failed to update mute settings');
        }
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
        if (!isAuth || !user) return;

        // Fetch group details
        const fetchGroupDoc = async () => {
            const snap = await getDoc(doc(db, 'groups', groupId));
            if (snap.exists()) setGroup({ id: snap.id, ...snap.data() } as Group);
        };
        fetchGroupDoc();

        // Subscribe to messages via FDC
        const unsubscribe = subscribe(
            listGroupMessagesRef({ groupName: groupId }),
            (result) => {
                const data: Message[] = result.data.groupMessages.map((gm) => ({
                    id: gm.id,
                    text: gm.messageContent,
                    senderId: gm.senderStudentId,
                    senderName: gm.senderStudentId === user.uid ? userProfile?.name : (gm.sender ? `${gm.sender.firstName} ${gm.sender.lastName}` : 'User'),
                    senderImage: gm.senderStudentId === user.uid ? userProfile?.profileImage : (gm.sender?.profilePictureUrl ?? ''),
                    gifUrl: gm.gifUrl ?? '',
                    imageUrl: gm.imageUrl ?? '',
                    audioUrl: gm.audioUrl ?? '',
                    reactions: (gm.reactions as Record<string, string[]>) ?? {},
                    timestamp: gm.sentAt ? new Date(gm.sentAt) : null,
                    isEdited: gm.isEdited ?? false,
                    isDeleted: gm.isDeleted ?? false,
                    replyToId: gm.replyToId ?? undefined,
                }));
                setMessages(data);
            }
        );

        return () => unsubscribe();
    }, [groupId, isAuth, user, userProfile]);

    useEffect(() => {
        if (user && isAuth) {
            // clear unread count for this user when viewing chat
            const groupRef = doc(db, 'groups', groupId);
            updateDoc(groupRef, {
                [`unreadCount.${user.uid}`]: 0
            }).catch(() => {});
        }
    }, [groupId, user, isAuth, messages.length]);

    // Typing Status Observer
    useEffect(() => {
        if (!user || !userProfile || !groupId || !rtdb) return;

        const typingRef = ref(rtdb, `typing/groups/${groupId}`);
        
        const unsubscribe = onValue(typingRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const typingObj = Object.entries(data)
                    .filter(([uid, val]) => val !== false && uid !== user.uid)
                    .map(([uid, val]) => ({ uid, name: (val as { name: string })?.name as string }));
                
                setTypingUsers(typingObj);
            } else {
                setTypingUsers([]);
            }
        });

        return () => unsubscribe();
    }, [groupId, user, userProfile]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!user || !userProfile || !groupId || !rtdb) return;
        const userTypingRef = ref(rtdb, `typing/groups/${groupId}/${user.uid}`);
        
        if (isTyping) {
            set(userTypingRef, { name: userProfile.name, timestamp: Date.now() });
            onDisconnect(userTypingRef).remove();
        } else {
            remove(userTypingRef);
        }
    }, [groupId, user, userProfile]);

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        const cleanMessage = sanitiseInput(payload.text);
        if ((!cleanMessage && !payload.gifUrl && !payload.imageUrl && !payload.audioUrl) || !userProfile || !user || !isAuth) return;

        handleTyping(false);

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
            replyToId: replyToMessage?.id
        };

        addOptimisticMessage(optimisticMsg);

        try {
            await sendGroupMessage({
                senderId: user.uid,
                groupName: groupId,
                messageContent: cleanMessage,
                gifUrl: payload.gifUrl,
                imageUrl: payload.imageUrl,
                audioUrl: payload.audioUrl,
                replyToId: replyToMessage?.id
            });
            setReplyToMessage(null);
            
            // Increment unread count globally for the group in Firestore
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                const updates: Record<string, unknown> = {
                    lastMessage: cleanMessage || (payload.imageUrl ? '📷 Photo' : (payload.audioUrl ? '🎤 Voice Message' : '🎞 GIF')),
                    updatedAt: serverTimestamp()
                };
                
                groupData.memberIds.forEach((id: string) => {
                    if (id !== user.uid) {
                        updates[`unreadCount.${id}`] = (groupData.unreadCount?.[id] || 0) + 1;
                    }
                });
                
                await updateDoc(groupRef, updates);
            }

        } catch (error) {
            console.error(error);
            toast.error('Failed to send message');
        }
    }, [groupId, user, userProfile, isAuth, handleTyping, replyToMessage, addOptimisticMessage]);

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

        updateGroupMessage({ id: messageId, reactions: newReactions })
            .catch(() => toast.error('Failed to react.'));
    }, [optimisticMessages, user, addOptimisticMessage]);

    const handleStartEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditValue(msg.text);
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!editValue.trim()) return;
        try {
            await updateGroupMessage({
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
            await updateGroupMessage({
                id: messageId,
                messageContent: 'This message was deleted.',
                isEdited: false,
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

    if (!userProfile) {
        return (
            <DashboardLayout>
                <LoadingSpinner variant="full" message="Loading group chat…" />
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

    const filteredMessages = searchQuery.trim() 
        ? optimisticMessages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
        : optimisticMessages;

    // Render typing text based on how many users
    let typingText = '';
    if (typingUsers.length === 1) {
        typingText = `${typingUsers[0].name.split(' ')[0]} is typing...`;
    } else if (typingUsers.length === 2) {
        typingText = `${typingUsers[0].name.split(' ')[0]} and ${typingUsers[1].name.split(' ')[0]} are typing...`;
    } else if (typingUsers.length > 2) {
        typingText = `Several people are typing...`;
    }

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disableGroups" moduleName="Groups">
                <div className="flex flex-1 h-full overflow-hidden">
                    <div className="flex-1 flex flex-col h-full bg-[var(--ui-bg-base)] max-w-full min-w-0">
                        <ChannelHeader name={humanReadableName} description="Group Chat">
                            <Link href="/groups" className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded transition-colors mr-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <Users className="h-4 w-4 text-[var(--ui-text-muted)] mx-2" />
                            
                            <div className="flex-1 flex justify-end items-center gap-1">
                                {isSearching ? (
                                    <div className="flex items-center bg-[var(--ui-bg-hover)] rounded-full px-3 py-1.5 w-full max-w-xs animate-[scale-in_0.2s_ease-out]">
                                        <Search className="w-4 h-4 text-[var(--ui-text-muted)] shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search messages..."
                                            className="bg-transparent border-none outline-none text-sm text-[var(--ui-text)] ml-2 w-full min-w-0"
                                            autoFocus
                                        />
                                        <button 
                                            onClick={() => {
                                                setIsSearching(false);
                                                setSearchQuery('');
                                            }}
                                            className="p-1 hover:bg-[var(--ui-bg-elevated)] rounded-full text-[var(--ui-text-muted)] transition-colors shrink-0 ml-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setIsSearching(true)}
                                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] transition-colors"
                                        >
                                            <Search className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => setDetailsOpen(!detailsOpen)}
                                            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </ChannelHeader>

                        <Virtuoso
                            ref={virtuosoRef}
                            data={filteredMessages}
                            initialTopMostItemIndex={Math.max(0, filteredMessages.length - 1)}
                            followOutput="auto"
                            className="flex-1 overflow-x-hidden px-4"
                            itemContent={(i, msg) => {
                                const isMine = msg.senderId === user?.uid;
                                const prev = i > 0 ? filteredMessages[i - 1] : null;
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
                                        replyToMsg={msg.replyToId ? optimisticMessages.find(m => m.id === msg.replyToId) : null}
                                        editingMessageId={editingMessageId}
                                        editValue={editValue}
                                        setEditValue={setEditValue}
                                        onStartEdit={handleStartEdit}
                                        onSaveEdit={handleSaveEdit}
                                        onCancelEdit={() => setEditingMessageId(null)}
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
                                        {optimisticMessages.length === 0 && !searchQuery && (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                                <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                                    <Users className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                                </div>
                                                <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #{humanReadableName}!</h3>
                                                <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the start of the group. Say hello! 👋</p>
                                            </div>
                                        )}
                                        {searchQuery && filteredMessages.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-[var(--ui-text-muted)]">
                                                <p>No messages found matching &quot;{searchQuery}&quot;</p>
                                            </div>
                                        )}
                                    </>
                                ),
                                Footer: () => (
                                    <>
                                        {typingUsers.length > 0 && (
                                            <div className="flex justify-start animate-fade-in-up mt-4 mb-4 ml-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] p-3 rounded-2xl rounded-bl-sm inline-flex items-center gap-1 shadow-sm border border-[var(--ui-border)]/50">
                                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                    <span className="text-xs text-[var(--ui-text-muted)] animate-pulse">
                                                        {typingText}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="h-4" />
                                    </>
                                )
                            }}
                        />

                        {/* Input Area */}
                        <div className="shrink-0 bg-[var(--ui-bg-surface)] border-t border-[var(--ui-divider)] pb-safe shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)] z-20 sticky bottom-0">
                            <div className="max-w-3xl mx-auto p-4 transition-all duration-300">
                                <ChatInput
                                    onSend={handleSend}
                                    onTyping={handleTyping}
                                    disabled={false}
                                    placeholder={`Message ${group?.name || humanReadableName}...`}
                                    chatId={`group_${groupId}`}
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

                    {/* Right Drawer */}
                    {group && (
                        <GroupDetailsDrawer
                            isOpen={detailsOpen}
                            onClose={() => setDetailsOpen(false)}
                            group={group}
                            messages={optimisticMessages as any}
                            onSearchClick={() => {
                                setDetailsOpen(false);
                                setIsSearching(true);
                            }}
                            isMuted={isMuted}
                            onToggleMute={handleToggleMute}
                            onRemoveMember={async (uid: string) => {
                                if (confirm('Are you sure you want to remove this member?')) {
                                    try {
                                        const groupRef = doc(db, 'groups', groupId);
                                        const newMembers = (group.memberIds as string[]).filter((id: string) => id !== uid);
                                        const newAdmins = ((group.adminIds as string[]) || []).filter((id: string) => id !== uid);
                                        await updateDoc(groupRef, { 
                                            memberIds: newMembers,
                                            adminIds: newAdmins
                                        });
                                        toast.success('Member removed');
                                    } catch {
                                        toast.error('Failed to remove member');
                                    }
                                }
                            }}
                            onLeaveGroup={async () => {
                                if (confirm('Are you sure you want to leave this group?')) {
                                    try {
                                        const groupRef = doc(db, 'groups', groupId);
                                        const userIdx = user ? (group.memberIds as string[]).indexOf(user.uid) : -1;
                                        if (userIdx > -1) {
                                            const newMembers = [...(group.memberIds as string[])];
                                            newMembers.splice(userIdx, 1);
                                            await updateDoc(groupRef, { memberIds: newMembers });
                                            toast.success('Left group');
                                            window.location.href = '/groups';
                                        }
                                    } catch {
                                        toast.error('Failed to leave group');
                                    }
                                }
                            }}
                        />
                    )}
                </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
