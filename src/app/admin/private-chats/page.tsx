'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, limit, where, deleteDoc, doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { ShieldAlert, Search, User as UserIcon, MessageSquare, Lock, Info, Activity, Trash2, Ban, MicOff, Image as ImageIcon, ExternalLink, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { resolveProfileImage } from '@/lib/profileImage';
import LoadingSpinner from '@/components/LoadingSpinner';

/* ── Types ── */
interface UserData {
    uid: string;
    email: string;
    name: string;
    profileImage?: string;
    status: string;
    createdAt?: number;
}

interface ChatInfo {
    id: string;
    participants: string[];
    participantNames?: Record<string, string>;
    participantImages?: Record<string, string>;
    lastMessage?: string;
    updatedAt?: Timestamp;
}

interface Message {
    id: string;
    text: string;
    senderId: string;
    gifUrl?: string;
    imageUrl?: string;
    timestamp?: Timestamp | null;
}

export default function PrivateChatOversightPage() {
    const { userProfile } = useStore();
    
    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [userChats, setUserChats] = useState<ChatInfo[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    
    // Advanced UI State
    const [activeTab, setActiveTab] = useState<'stream' | 'media' | 'log'>('stream');
    const [chatFilter, setChatFilter] = useState<'all' | 'flagged'>('all');
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    
    // Loading States
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial User Load
    useEffect(() => {
        if (!userProfile || userProfile.role !== 'admin') return;
        fetchUsers();
    }, [userProfile]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users for oversight.');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchUsers();
            return;
        }
        
        setLoadingUsers(true);
        try {
            // Very basic prefix search on email for demonstration
            // Real apps might use Algolia or Meilisearch for robust querying
            const q = query(
                collection(db, 'users'),
                where('email', '>=', searchQuery.toLowerCase()),
                where('email', '<=', searchQuery.toLowerCase() + '\uf8ff'),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
            setUsers(data);
        } catch (error) {
            console.error('Search failed:', error);
            toast.error('Search failed.');
        } finally {
            setLoadingUsers(false);
        }
    };

    // Load active chats for selected user
    useEffect(() => {
        if (!selectedUser) {
            setUserChats([]);
            setSelectedChat(null);
            return;
        }

        setLoadingChats(true);
        setSelectedChat(null); // Reset chat selection

        const q = query(
            collection(db, 'private_chats'),
            where('participants', 'array-contains', selectedUser.uid),
            orderBy('updatedAt', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatInfo));
            setUserChats(chats);
            setLoadingChats(false);
        }, (error) => {
            console.error('Chat list listener error:', error);
            toast.error('Failed to load user chats.');
            setLoadingChats(false);
        });

        return () => unsubscribe();
    }, [selectedUser]);

    // Stream messages for selected chat
    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);

        const q = query(
            collection(db, 'private_messages', selectedChat.id, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(150)
        );

        // STEALTH MODE: We just read the snapshot. We do NOT update the `lastRead` field 
        // in the chat document. Neither user will know we are watching.
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
            setLoadingMessages(false);
        }, (error) => {
            console.error('Message listener error:', error);
            toast.error('Failed to stream messages.');
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [selectedChat]);

    // Security Check
    if (!userProfile) return <div className="h-full flex items-center justify-center"><LoadingSpinner variant="full" /></div>;
    
    if (userProfile.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4 animate-[fade-in-up_0.4s_ease-out]">
                <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <Lock className="h-10 w-10 text-[var(--ui-danger)]" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ui-text)] mb-3">
                    Classified Clearance Required
                </h1>
                <p className="text-base text-[var(--ui-text-muted)] max-w-md mx-auto leading-relaxed">
                    This module is strictly restricted to Level-5 Administrators due to privacy constraints. Your access level (`{userProfile.role}`) does not permit oversight of encrypted private communications.
                </p>
            </div>
        );
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!selectedChat) return;
        if (!confirm('Are you sure you want to permanently delete this message? This action bypasses user control.')) return;
        
        try {
            await deleteDoc(doc(db, 'private_messages', selectedChat.id, 'messages', messageId));
            toast.success('Message purged from existence.');
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to purge message.');
        }
    };

    const handleBanUser = () => {
        toast.success(`Restriction protocols initiated for ${selectedUser?.name}`);
        // To be implemented in backend
    };

    const handleMuteUser = () => {
        toast.success(`Comms muted for ${selectedUser?.name}`);
        // To be implemented in backend
    };

    return (
        <div className="h-full flex flex-col font-sans animate-[fade-in-up_0.4s_ease-out] bg-zinc-950 text-zinc-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-3 relative">
                        {/* Radioactive pulse effect behind icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/30 relative z-10 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                Private Chat Oversight
                            </h1>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Classified deep-inspection of end-to-end encrypted user communications.
                            </p>
                        </div>
                    </div>
                    <div className="bg-red-500/10 text-red-500 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full border border-red-500/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Stealth Mode Active
                    </div>
                </div>

                {/* 3-Pane Layout */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Pane 1: Search & User Select */}
                    <div className="w-80 border-r border-zinc-800/80 flex flex-col bg-zinc-900/40 shrink-0">
                        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/80">
                            <div className="flex items-center gap-2 mb-3 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                                <Search className="w-3 h-3" />
                                User Selection
                            </div>
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search users by email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                                />
                            </form>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingUsers ? (
                                <div className="p-4 flex justify-center"><LoadingSpinner variant="inline" /></div>
                            ) : users.length === 0 ? (
                                <p className="p-4 text-center text-sm text-zinc-500">No users found.</p>
                            ) : (
                                <div className="space-y-1">
                                    {users.map(u => (
                                        <button
                                            key={u.uid}
                                            onClick={() => setSelectedUser(u)}
                                            className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                                                selectedUser?.uid === u.uid 
                                                    ? 'bg-blue-500/10 ring-1 ring-blue-500/30 shadow-[inset_0_0_15px_rgba(59,130,246,0.05)]' 
                                                    : 'hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800/50'
                                            }`}
                                        >
                                            <div className="relative">
                                                <img 
                                                    src={resolveProfileImage(u.profileImage, undefined, u.name)} 
                                                    alt="" 
                                                    className={`w-10 h-10 rounded-full object-cover shrink-0 ${selectedUser?.uid === u.uid ? 'ring-2 ring-blue-500/50' : ''}`} 
                                                />
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${u.status === 'online' ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-semibold truncate ${selectedUser?.uid === u.uid ? 'text-blue-400' : 'text-zinc-200'}`}>{u.name}</p>
                                                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pane 2: Target User's Active Chats */}
                    <div className="w-80 border-r border-zinc-800/80 flex flex-col bg-zinc-900/60 shrink-0">
                        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/80">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-zinc-400" />
                                Active Conversations
                            </h2>
                            {selectedUser && (
                                <p className="text-xs text-zinc-500 mt-1 truncate">
                                    Intercepting <span className="text-blue-400 font-medium">{selectedUser.name}</span>
                                </p>
                            )}
                            
                            {/* Filter Tabs */}
                            <div className="flex gap-1 mt-4 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                                <button
                                    onClick={() => setChatFilter('all')}
                                    className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all ${chatFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    All Chats
                                </button>
                                <button
                                    onClick={() => setChatFilter('flagged')}
                                    className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${chatFilter === 'flagged' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-zinc-500 hover:text-red-400/70'}`}
                                >
                                    <ShieldAlert className="w-3 h-3" /> Flagged
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2">
                            {!selectedUser ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-600">
                                    <UserIcon className="h-10 w-10 mb-3 opacity-20" />
                                    <p className="text-sm">Select a user to view their active chats.</p>
                                </div>
                            ) : loadingChats ? (
                                <div className="p-4 flex justify-center"><LoadingSpinner variant="inline" /></div>
                            ) : userChats.length === 0 ? (
                                <p className="p-4 text-center text-sm text-zinc-500">This user has no private chats.</p>
                            ) : (
                                <div className="space-y-1">
                                    {userChats.map(chat => {
                                        // Simple logic for flagged (mocking for now unless DB has it)
                                        const isFlagged = false; 
                                        if (chatFilter === 'flagged' && !isFlagged) return null;

                                        const partnerId = chat.participants.find(id => id !== selectedUser.uid) || 'Unknown';
                                        const partnerName = chat.participantNames?.[partnerId] || 'User';
                                        const partnerImage = resolveProfileImage(chat.participantImages?.[partnerId], undefined, partnerName);
                                        const timeAgo = chat.updatedAt ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true }).replace('about ', '') : '';

                                        return (
                                            <button
                                                key={chat.id}
                                                onClick={() => setSelectedChat(chat)}
                                                className={`w-full text-left flex gap-3 p-3 rounded-xl transition-all group ${
                                                    selectedChat?.id === chat.id 
                                                        ? 'bg-zinc-800/80 ring-1 ring-zinc-700 shadow-sm' 
                                                        : 'hover:bg-zinc-800/40 border border-transparent'
                                                }`}
                                            >
                                                <div className="relative shrink-0">
                                                    <img src={partnerImage} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-800/50" />
                                                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 ring-2 ring-zinc-900 shadow-sm">
                                                        <Activity className="w-2.5 h-2.5 text-white animate-pulse" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className={`text-sm font-semibold truncate pr-2 ${selectedChat?.id === chat.id ? 'text-white' : 'text-zinc-200'}`}>
                                                            {partnerName}
                                                        </p>
                                                        <span className="text-[10px] text-zinc-500 shrink-0">{timeAgo}</span>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 truncate opacity-80 decoration-red-400/30">
                                                        {chat.lastMessage || 'New connection'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pane 3: Deep Inspection Stream */}
                    <div className="flex-1 flex flex-col bg-zinc-950 relative">
                        {/* Top Header */}
                        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md shrink-0">
                            <div className="flex items-center gap-4">
                                {selectedChat ? (
                                    <>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold tracking-wide shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                                            LIVE INTERCEPT
                                        </div>
                                        <p className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                                            <Lock className="w-3 h-3 text-red-400" /> E2EE BYPASS
                                        </p>
                                    </>
                                ) : (
                                    <h2 className="text-sm font-semibold text-zinc-500 flex items-center gap-2">
                                        <Info className="h-4 w-4" /> Message Stream Offline
                                    </h2>
                                )}
                             </div>
                             
                             {/* Advanced Quick Actions */}
                             {selectedChat && selectedUser && (
                                 <div className="flex items-center gap-2 opacity-0 animate-[fade-in_0.3s_ease-out_forwards]">
                                     <button onClick={handleMuteUser} className="p-2 text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all" title="Mute User">
                                         <MicOff className="w-4 h-4" />
                                     </button>
                                     <button onClick={handleBanUser} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-bold transition-all shadow-sm" title="Ban User">
                                         <Ban className="w-3.5 h-3.5" /> BAN
                                     </button>
                                     <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                                     <a href={`/profile/${selectedUser.uid}`} target="_blank" className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Full Profile">
                                         <ExternalLink className="w-4 h-4" />
                                     </a>
                                 </div>
                             )}
                        </div>

                        {/* Secondary Toolbar */}
                        {selectedChat && (
                            <div className="px-4 py-2 bg-zinc-900/40 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                                    <button 
                                        onClick={() => setActiveTab('stream')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'stream' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <Activity className="w-3.5 h-3.5" /> Stream
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('media')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'media' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" /> Media Gallery
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('log')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'log' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <Info className="w-3.5 h-3.5" /> Action Log
                                    </button>
                                </div>
                                
                                {activeTab === 'stream' && (
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Search messages..." 
                                            value={messageSearchQuery}
                                            onChange={(e) => setMessageSearchQuery(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 w-48 transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stream Content */}
                        <div className="flex-1 overflow-y-auto p-6 relative">
                            {/* Matrix-like background effect */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0)_0%,rgba(9,9,11,1)_100%)] pointer-events-none z-0"></div>
                            <div className="relative z-10 h-full">
                            {!selectedChat ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                                    <Lock className="h-16 w-16 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Select a conversation to begin deep inspection.</p>
                                </div>
                            ) : loadingMessages ? (
                                <div className="flex items-center justify-center h-full"><LoadingSpinner variant="inline" message="Bypassing encryption..." /></div>
                            ) : messages.length === 0 ? (
                                <p className="text-center text-sm text-zinc-500 italic">No internal messages recorded in this channel.</p>
                            ) : activeTab === 'media' ? (
                                <div className="grid grid-cols-3 gap-2 pb-4">
                                    {messages.filter(m => m.imageUrl || m.gifUrl).map(m => (
                                        <div key={m.id} className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group">
                                            <img src={m.imageUrl || m.gifUrl} alt="Media" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
                                                <button onClick={() => handleDeleteMessage(m.id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {messages.filter(m => m.imageUrl || m.gifUrl).length === 0 && (
                                        <div className="col-span-3 text-center text-sm text-zinc-500 py-10">No media files intercepted in this chat.</div>
                                    )}
                                </div>
                            ) : activeTab === 'log' ? (
                                <div className="text-center text-sm text-zinc-500 py-10 font-mono">
                                    [SYSTEM_LOG] Action history not available.
                                </div>
                            ) : (
                                <div className="space-y-3 pb-4">
                                    {messages
                                        .filter(msg => !messageSearchQuery || msg.text?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                                        .map((msg, i, filteredMessages) => {
                                        const prev = i > 0 ? filteredMessages[i - 1] : null;
                                        const showHeader = msg.senderId !== prev?.senderId || (msg.timestamp?.toMillis() || 0) - (prev?.timestamp?.toMillis() || 0) > 300000;
                                        const isTarget = msg.senderId === selectedUser?.uid;
                                        
                                        const senderName = msg.senderId === selectedUser?.uid 
                                            ? selectedUser.name 
                                            : selectedChat.participantNames?.[msg.senderId] || 'User';
                                            
                                        const senderImage = resolveProfileImage(
                                            msg.senderId === selectedUser?.uid ? selectedUser.profileImage : selectedChat.participantImages?.[msg.senderId],
                                            undefined,
                                            senderName
                                        );

                                        const ts = msg.timestamp?.toDate?.() ? format(msg.timestamp.toDate(), 'HH:mm') : '';

                                        return (
                                            <div key={msg.id} className={`flex gap-3 max-w-[85%] relative group/msg ${isTarget ? 'ml-auto flex-row-reverse' : ''} ${showHeader ? 'mt-6' : 'mt-1'}`}>
                                                {showHeader && (
                                                    <img src={senderImage} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-zinc-800" />
                                                )}
                                                {!showHeader && <div className="w-8 shrink-0" />}

                                                <div className={`flex flex-col ${isTarget ? 'items-end' : 'items-start'}`}>
                                                    {showHeader && (
                                                        <div className="flex items-baseline gap-2 mb-1 px-1">
                                                            <span className="text-[13px] font-semibold text-zinc-200">{senderName}</span>
                                                            <span className="text-[10px] text-zinc-500">{format(msg.timestamp?.toDate() || new Date(), 'dd MMM, HH:mm')}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-2 flex-row-reverse">
                                                        <div className={`px-4 py-2.5 rounded-2xl relative group-hover/msg:shadow-md transition-all ${
                                                            isTarget 
                                                                ? 'bg-blue-600/90 text-white rounded-tr-sm border border-blue-500/30' 
                                                                : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-tl-sm'
                                                        }`}>
                                                            {msg.gifUrl && <img src={msg.gifUrl} alt="GIF" className="max-w-[250px] rounded-lg mb-1" />}
                                                            {msg.imageUrl && <img src={msg.imageUrl} alt="Photo" className="max-w-[250px] rounded-lg mb-1" />}
                                                            {msg.text && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                                                {/* Highlight search query if active */}
                                                                {messageSearchQuery && msg.text.toLowerCase().includes(messageSearchQuery.toLowerCase()) ? (
                                                                    <span dangerouslySetInnerHTML={{ __html: msg.text.replace(new RegExp(`(${messageSearchQuery})`, 'gi'), '<mark class="bg-yellow-500/50 text-white rounded px-0.5">$1</mark>') }} />
                                                                ) : msg.text}
                                                            </p>}
                                                            
                                                            {/* Timestamp overlay */}
                                                            <span className={`text-[9px] mt-1 block text-right select-none ${isTarget ? 'text-white/60' : 'text-zinc-500'}`}>
                                                                {ts}
                                                            </span>
                                                        </div>

                                                        {/* Advanced Admin Controls (Delete) */}
                                                        <button 
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all shrink-0"
                                                            title="Purge Message"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                            </div>
                        </div>
                        
                        {/* Fake Input to make it look like a chat app */}
                        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex gap-2 shrink-0 opacity-50 cursor-not-allowed pointer-events-none relative z-10">
                             <div className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-full flex items-center px-4 text-sm text-zinc-500">
                                 Read-only mode (Deep Inspection)...
                             </div>
                        </div>
                    </div>
                </div>
            </div>
    );
}
