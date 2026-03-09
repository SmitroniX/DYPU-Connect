'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import type { Group, GroupMessage as Message } from '@/types/groups';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { resolveProfileImage } from '@/lib/profileImage';
import ChannelHeader from '@/components/ChannelHeader';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import ProfilePopup from '@/components/ProfilePopup';
import GroupDetailsDrawer from '@/components/GroupDetailsDrawer';
import { ArrowLeft, Users, ShieldAlert, MoreVertical, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { sanitiseInput, filterProfanity } from '@/lib/security';
import { shouldShowHeader } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { rtdb } from '@/lib/firebase'; // Assuming rtdb is exported from here
import { ref, onValue, set, onDisconnect, remove } from 'firebase/database';
import ModuleGuard from '@/components/ModuleGuard'; // Assuming ModuleGuard is a new component



export default function GroupChatDetail({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [profilePopup, setProfilePopup] = useState<{ userId: string; rect: DOMRect } | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [group, setGroup] = useState<Group | null>(null); // Renamed from groupData to group
    const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; name: string }>>([]);

    const searchInputRef = useRef<HTMLInputElement>(null);

    const { user } = useAuth();
    const { userProfile } = useStore();
    const isMuted = userProfile?.mutedEntities?.includes(groupId) ?? false;
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
            collection(db, 'groups', groupId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        // Also fetch the group document itself for the drawer
        const fetchGroupDoc = async () => {
            const snap = await getDoc(doc(db, 'groups', groupId));
            if (snap.exists()) setGroup({ id: snap.id, ...snap.data() } as Group);
        };
        fetchGroupDoc();

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
                        senderImage: raw.senderProfileImage ?? '',
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

    useEffect(() => {
        if (user && isAuth) {
            // clear unread count for this user when viewing chat
            const groupRef = doc(db, 'groups', groupId);
            updateDoc(groupRef, {
                [`unreadCount.${user.uid}`]: 0
            }).catch(() => {});
        }
    }, [groupId, user, isAuth, messages.length]);

    useEffect(() => { scrollToBottom(); }, [messages]);

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
        if ((!cleanMessage && !payload.gifUrl && !payload.imageUrl) || !userProfile || !user || !isAuth) return;

        // Clear typing status immediately upon sending
        handleTyping(false);

        const msgData: Record<string, unknown> = {
            text: cleanMessage,
            senderId: user.uid,
            senderName: userProfile.name,
            senderImage: userProfile.profileImage,
            timestamp: serverTimestamp(),
        };
        if (payload.gifUrl) msgData.gifUrl = payload.gifUrl;
        if (payload.imageUrl) msgData.imageUrl = payload.imageUrl;

        try {
            await addDoc(collection(db, 'groups', groupId, 'messages'), msgData);
            
            // Increment unread count globally for the group
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                const updates: Record<string, unknown> = {
                    lastMessage: cleanMessage || (payload.imageUrl ? 'Sent an image' : 'Sent a GIF'),
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
    }, [groupId, user, userProfile, isAuth, handleTyping]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
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

    const filteredMessages = messages.filter(msg => 
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                            ref={searchInputRef}
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

                        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                            {filteredMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                    <Users className="h-8 w-8 text-[var(--ui-text-muted)]" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #{humanReadableName}!</h3>
                                <p className="text-sm text-[var(--ui-text-muted)] mt-1">This is the start of the group. Say hello! 👋</p>
                            </div>
                        ) : (
                            filteredMessages.map((msg, i) => {
                                const isMine = msg.senderId === user?.uid;
                                const prev = i > 0 ? messages[i - 1] : null;
                                const showMsgHeader = shouldShowHeader(
                                    msg.senderId,
                                    prev?.senderId,
                                    msg.timestamp?.toDate?.() ?? null,
                                    prev?.timestamp?.toDate?.() ?? null
                                );
                                const ts = msg.timestamp?.toDate?.();
                                const msgRef = doc(db, 'groups', groupId, 'messages', msg.id); // Corrected collection path

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
                                                        src={resolveProfileImage(msg.senderImage || '', undefined, msg.senderName || 'User')}
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
                        
                        {typingUsers.length > 0 && (
                            <div className="flex justify-start animate-fade-in-up mt-4">
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
                        
                        <div ref={messagesEndRef} className="h-4" />
                    </div>

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
                        messages={messages}
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
