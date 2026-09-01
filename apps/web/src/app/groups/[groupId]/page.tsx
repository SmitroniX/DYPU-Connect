'use client';

import { use, useCallback, useEffect, useRef, useState, useOptimistic, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, getDoc, serverTimestamp, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
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
    const [group, setGroup] = useState<any>(null);
    const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; name: string }>>([]);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [isAuth, setIsAuth] = useState<boolean | null>(null);

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

    useEffect(() => {
        let isMounted = true;
        if (!user || !userProfile) return;

        const fetchGroupDoc = async () => {
            try {
                const snap = await getDoc(doc(db, 'groups', groupId));
                if (!isMounted) return;
                
                if (snap.exists()) {
                    const groupData = { id: snap.id, ...snap.data() } as Group;
                    setGroup(groupData);
                    
                    const { field, year, division } = userProfile;
                    const matchesField = groupId === `field_${field.replace(/\s+/g, '_')}`;
                    const matchesYear = groupId === `year_${field.replace(/\s+/g, '_')}_${year.replace(/\s+/g, '_')}`;
                    const matchesDiv = groupId === `division_${field.replace(/\s+/g, '_')}_${year.replace(/\s+/g, '_')}_${division}`;
                    const isCustomGroup = (groupData as any).memberIds?.includes(user.uid);
                    
                    if (matchesField || matchesYear || matchesDiv || isCustomGroup || userProfile.role === 'admin') {
                        setIsAuth(true);
                    } else {
                        setIsAuth(false);
                    }
                } else {
                    setIsAuth(false);
                }
            } catch {
                setIsAuth(false);
            }
        };
        fetchGroupDoc();
        return () => { isMounted = false; };
    }, [groupId, user, userProfile]);

    useEffect(() => {
        if (isAuth === null || !isAuth || !user) return;

        const messagesRef = collection(db, 'groups', groupId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: Message[] = snapshot.docs.map((docSnap) => {
                const docData = docSnap.data();
                return {
                    id: docSnap.id,
                    text: docData.text || '',
                    senderId: docData.senderId || '',
                    senderName: docData.senderName || 'Unknown User',
                    senderImage: docData.senderImage || '',
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
    }, [groupId, isAuth, user]);

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
            const messagesRef = collection(db, 'groups', groupId, 'messages');
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
                reactions: {},
                isEdited: false,
                isDeleted: false
            });

            setReplyToMessage(null);

            // Increment unread count globally for the group in Firestore
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                const updates: Record<string, any> = {
                    lastMessage: cleanMessage || (payload.audioUrl ? '🎤 Voice Message' : (payload.imageUrl ? '📷 Photo' : 'GIF')),
                    lastMessageTime: serverTimestamp()
                };

                if (groupData.memberIds) {
                    groupData.memberIds.forEach((id: string) => {
                        if (id !== user.uid) {
                            updates[`unreadCount.${id}`] = (groupData.unreadCount?.[id] || 0) + 1;
                        }
                    });
                }
                await updateDoc(groupRef, updates);
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    }, [groupId, user, userProfile, isAuth, handleTyping, replyToMessage, addOptimisticMessage]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user || !isAuth) return;
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

        const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
        updateDoc(msgRef, { reactions: newReactions })
            .catch(() => toast.error('Failed to react.'));
    }, [optimisticMessages, user, isAuth, addOptimisticMessage, groupId]);

    const handleStartEdit = useCallback((msg: Message) => {
        setEditingMessageId(msg.id);
        setEditValue(msg.text);
    }, []);

    const handleSaveEdit = useCallback(async (messageId: string) => {
        if (!editValue.trim() || !isAuth) return;
        try {
            const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
            await updateDoc(msgRef, {
                text: editValue.trim(),
                isEdited: true,
            });
            setEditingMessageId(null);
            setEditValue('');
        } catch {
            toast.error('Failed to edit message.');
        }
    }, [editValue, isAuth, groupId]);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditValue('');
    }, []);

    const handleDelete = useCallback(async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?') || !isAuth) return;
        try {
            const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
            await updateDoc(msgRef, {
                text: 'This message was deleted.',
                isEdited: false,
                isDeleted: true
            });
        } catch {
            toast.error('Failed to delete message.');
        }
    }, [isAuth, groupId]);

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

    const typingText = typingUsers.length === 1 
        ? `${typingUsers[0].name} is typing...`
        : typingUsers.length > 1 
        ? `${typingUsers.map(u => u.name).join(', ')} are typing...` 
        : '';

    if (isAuth === null) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center">
                    <LoadingSpinner variant="full" message="Loading group chat…" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isAuth) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center bg-[var(--ui-bg-base)]">
                    <ShieldAlert className="h-16 w-16 text-[var(--ui-danger)]/50 mb-4" />
                    <h2 className="text-xl font-bold text-[var(--ui-text)]">Access Denied</h2>
                    <p className="text-sm text-[var(--ui-text-muted)]">You are not a member of this group.</p>
                    <Link href="/groups" className="mt-4 text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] font-medium transition-colors text-sm">
                        Back to Groups
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disableGroups" moduleName="Groups">
                <div className="flex flex-col h-full bg-[var(--ui-bg-base)]">
                    {/* Fixed Header */}
                    <div className="shrink-0 z-30">
                        <ChannelHeader 
                            name={group?.name || humanReadableName} 
                            description={`${group?.memberIds?.length || 0} members`} 
                            type="text"
                        >
                            <Link href="/groups" className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded transition-colors mr-2">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => setIsSearching(!isSearching)}
                                className="p-2 text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-surface)] hover:text-[var(--ui-text)] rounded-full transition-colors hidden sm:block"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDetailsOpen(true)}
                                className="p-2 text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-surface)] hover:text-[var(--ui-text)] rounded-full transition-colors ml-1"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </ChannelHeader>
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

                        {/* Messages Area */}
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
                                    msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any)?.toDate?.() ?? null,
                                    prev?.timestamp instanceof Date ? prev.timestamp : (prev?.timestamp as any)?.toDate?.() ?? null
                                );

                                return (
                                    <MessageItem
                                        key={msg.id}
                                        msg={msg}
                                        isMine={isMine}
                                        showMsgHeader={showMsgHeader}
                                        currentUserId={user?.uid || ''}
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
                        <div className="shrink-0 bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent sticky bottom-0 z-20">
                            <div className="max-w-3xl mx-auto transition-all duration-300">
                                <ChatInput
                                    onSend={handleSend}
                                    onTyping={handleTyping}
                                    disabled={false}
                                    placeholder={`Message ${group ? (group as any).name : humanReadableName}...`}
                                    chatId={`group_${groupId}`}
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

                    {/* Right Drawer */}
                    {group && (
                        <>
                        <GroupDetailsDrawer
                            isOpen={detailsOpen}
                            onClose={() => setDetailsOpen(false)}
                            group={group as unknown as Group}
                            messages={optimisticMessages}
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
                                        const currentGroup = group as any;
                                        const newMembers = (currentGroup.memberIds || []).filter((id: string) => id !== uid);
                                        const newAdmins = (currentGroup.adminIds || []).filter((id: string) => id !== uid);
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
                                        const currentGroup = group as any;
                                        const userIdx = user ? (currentGroup.memberIds || []).indexOf(user.uid) : -1;
                                        if (userIdx > -1) {
                                            const newMembers = [...(currentGroup.memberIds || [])];
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
                        </>
                    )}
                </div>
            </ModuleGuard>
        </DashboardLayout>
    );
}
