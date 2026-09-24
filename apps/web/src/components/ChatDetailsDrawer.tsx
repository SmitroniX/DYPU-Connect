'use client';

import { useState, useEffect } from 'react';
import { 
    X, 
    Search, 
    Image as ImageIcon, 
    Bell, 
    BellOff, 
    Ban, 
    Trash2, 
    Mail, 
    GraduationCap, 
    AlertTriangle,
    Music,
    Shield
} from 'lucide-react';
import { Message } from '@/lib/validation/schemas';
import { doc, getDoc, updateDoc, arrayUnion, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    otherName: string;
    otherImage: string;
    messages: Message[];
    onSearchClick?: () => void;
    isMuted?: boolean;
    onToggleMute?: () => void;
    chatId?: string;
    user?: { uid: string } | null;
    otherUserId?: string;
}

interface UserDetails {
    role?: string;
    email?: string;
    department?: string;
    bio?: string;
    verified?: boolean;
}

export default function ChatDetailsDrawer({
    isOpen,
    onClose,
    otherName,
    otherImage,
    messages,
    onSearchClick,
    isMuted = false,
    onToggleMute,
    chatId,
    user,
    otherUserId
}: ChatDetailsDrawerProps) {
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'images' | 'audio'>('all');
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [isActionPending, setIsActionPending] = useState(false);

    // Fetch user profile details when drawer opens
    useEffect(() => {
        if (!isOpen || !otherUserId) return;

        let cancelled = false;
        getDoc(doc(db, 'users', otherUserId))
            .then((snap) => {
                if (cancelled) return;
                if (snap.exists()) {
                    const data = snap.data();
                    setUserDetails({
                        role: data.role || 'Student',
                        email: data.email,
                        department: data.department || data.field || 'DYPU Campus',
                        bio: data.bio,
                        verified: data.verified ?? true,
                    });
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [isOpen, otherUserId]);

    const handleBlockUser = async () => {
        if (!user || !otherUserId) return;
        setIsActionPending(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                blockedUsers: arrayUnion(otherUserId)
            });
            toast.success(`Blocked ${otherName}`);
            setShowBlockDialog(false);
            onClose();
        } catch {
            toast.error('Failed to block user');
        } finally {
            setIsActionPending(false);
        }
    };

    const handleClearChat = async () => {
        if (!chatId) return;
        setIsActionPending(true);
        try {
            const messagesRef = collection(db, 'private_chats', chatId, 'messages');
            const snapshot = await getDocs(messagesRef);
            
            const batches: Promise<void>[] = [];
            let currentBatch = writeBatch(db);
            let operationCount = 0;
            
            snapshot.docs.forEach((docSnap) => {
                currentBatch.delete(docSnap.ref);
                operationCount++;
                
                if (operationCount === 500) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(db);
                    operationCount = 0;
                }
            });
            
            if (operationCount > 0) {
                batches.push(currentBatch.commit());
            }
            
            await Promise.all(batches);
            
            await updateDoc(doc(db, 'private_chats', chatId), {
                lastMessage: 'Chat cleared'
            });
            
            toast.success('Conversation cleared');
            setShowClearDialog(false);
            onClose();
        } catch {
            toast.error('Failed to clear chat');
        } finally {
            setIsActionPending(false);
        }
    };

    // Filter media items
    const imageMessages = messages.filter(m => !!(m.imageUrl || m.gifUrl));
    const audioMessages = messages.filter(m => !!m.audioUrl);
    const allMedia = [...imageMessages, ...audioMessages];

    const displayItems = activeMediaTab === 'images' 
        ? imageMessages 
        : activeMediaTab === 'audio' 
            ? audioMessages 
            : allMedia;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer with Spring Dampening */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed lg:static top-0 right-0 h-full w-80 sm:w-88 bg-[var(--ui-bg-surface)] border-l border-[var(--ui-border)] shadow-2xl lg:shadow-none z-50 flex flex-col shrink-0 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ui-border)]/70 bg-[var(--ui-bg-base)]/50 backdrop-blur-md">
                            <h2 className="font-bold text-[var(--ui-text)] text-base tracking-tight">Contact Info</h2>
                            <button 
                                onClick={onClose}
                                aria-label="Close contact info"
                                className="p-1.5 rounded-full hover:bg-[var(--ui-bg-hover)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6 scrollbar-thin">
                            {/* Profile Summary */}
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-3">
                                    <img 
                                        src={otherImage} 
                                        alt={otherName} 
                                        className="w-24 h-24 rounded-full object-cover ring-4 ring-[var(--ui-accent)]/20 shadow-xl bg-[var(--ui-bg-base)]"
                                    />
                                    <div className="absolute bottom-1 right-1 p-1 bg-[var(--ui-accent)] rounded-full text-white shadow-xs">
                                        <Shield className="w-3.5 h-3.5 fill-white/20" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-extrabold text-[var(--ui-text)] leading-tight">{otherName}</h3>
                                
                                {/* Role chip */}
                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-xs">
                                    <span>{userDetails?.role || 'DYPU Student'}</span>
                                </div>

                                {/* Email & Field details */}
                                <div className="mt-3.5 w-full space-y-1.5">
                                    {userDetails?.email && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--ui-bg-base)] border border-[var(--ui-border)]/60 text-xs text-[var(--ui-text-muted)]">
                                            <Mail className="w-3.5 h-3.5 text-[var(--ui-accent)] shrink-0" />
                                            <span className="truncate">{userDetails.email}</span>
                                        </div>
                                    )}
                                    {userDetails?.department && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--ui-bg-base)] border border-[var(--ui-border)]/60 text-xs text-[var(--ui-text-muted)]">
                                            <GraduationCap className="w-3.5 h-3.5 text-[var(--ui-accent)] shrink-0" />
                                            <span className="truncate">{userDetails.department}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex justify-around py-3 px-2 rounded-2xl bg-[var(--ui-bg-base)]/80 border border-[var(--ui-border)]/60 shadow-xs">
                                <button 
                                    onClick={onSearchClick}
                                    className="flex flex-col items-center gap-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors group cursor-pointer"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-[var(--ui-bg-surface)] flex items-center justify-center group-hover:bg-[var(--ui-accent)]/10 border border-[var(--ui-border)]/50 transition-colors">
                                        <Search className="w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-semibold">Search</span>
                                </button>
                                <button 
                                    onClick={onToggleMute}
                                    className={`flex flex-col items-center gap-1.5 transition-colors group cursor-pointer ${
                                        isMuted ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)]'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--ui-border)]/50 transition-colors ${
                                        isMuted ? 'bg-[var(--ui-accent)]/15 border-[var(--ui-accent)]/30 text-[var(--ui-accent)]' : 'bg-[var(--ui-bg-surface)] group-hover:bg-[var(--ui-accent)]/10'
                                    }`}>
                                        {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                    </div>
                                    <span className="text-[11px] font-semibold">{isMuted ? 'Unmute' : 'Mute'}</span>
                                </button>
                            </div>

                            {/* Shared Media Tabs Preview */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <h4 className="text-xs font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
                                        Shared Media
                                    </h4>
                                    <span className="text-xs font-semibold text-[var(--ui-text-muted)] bg-[var(--ui-bg-base)] px-2 py-0.5 rounded-full border border-[var(--ui-border)]/40">
                                        {allMedia.length}
                                    </span>
                                </div>

                                {/* Media Tabs */}
                                <div className="flex gap-1 p-1 bg-[var(--ui-bg-base)] rounded-xl border border-[var(--ui-border)]/60 mb-3">
                                    <button
                                        onClick={() => setActiveMediaTab('all')}
                                        className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                            activeMediaTab === 'all'
                                                ? 'bg-[var(--ui-bg-surface)] text-[var(--ui-text)] shadow-xs'
                                                : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                                        }`}
                                    >
                                        All ({allMedia.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveMediaTab('images')}
                                        className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                            activeMediaTab === 'images'
                                                ? 'bg-[var(--ui-bg-surface)] text-[var(--ui-text)] shadow-xs'
                                                : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                                        }`}
                                    >
                                        Photos ({imageMessages.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveMediaTab('audio')}
                                        className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                            activeMediaTab === 'audio'
                                                ? 'bg-[var(--ui-bg-surface)] text-[var(--ui-text)] shadow-xs'
                                                : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                                        }`}
                                    >
                                        Audio ({audioMessages.length})
                                    </button>
                                </div>

                                {/* Media Grid Preview */}
                                {displayItems.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {displayItems.slice(-6).reverse().map((msg) => {
                                            if (msg.imageUrl || msg.gifUrl) {
                                                return (
                                                    <div 
                                                        key={msg.id} 
                                                        className="aspect-square bg-[var(--ui-bg-base)] rounded-xl overflow-hidden group relative border border-[var(--ui-border)]/50 shadow-xs"
                                                    >
                                                        <img 
                                                            src={msg.imageUrl || msg.gifUrl} 
                                                            alt="Shared media" 
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                                                        />
                                                    </div>
                                                );
                                            }
                                            if (msg.audioUrl) {
                                                return (
                                                    <div 
                                                        key={msg.id} 
                                                        className="aspect-square bg-[var(--ui-bg-base)] rounded-xl flex flex-col items-center justify-center p-2 border border-[var(--ui-border)]/50 text-[var(--ui-accent)] hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                                                        title="Voice memo"
                                                    >
                                                        <Music className="w-5 h-5 mb-1" />
                                                        <span className="text-[10px] font-semibold text-[var(--ui-text-muted)]">Voice</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-28 bg-[var(--ui-bg-base)]/50 rounded-2xl border border-dashed border-[var(--ui-border)] text-center px-4">
                                        <ImageIcon className="w-6 h-6 text-[var(--ui-text-muted)] mb-1.5 opacity-40" />
                                        <span className="text-xs text-[var(--ui-text-muted)] font-medium">No shared items in this category</span>
                                    </div>
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-3 border-t border-[var(--ui-border)]/50 space-y-2">
                                <button 
                                    onClick={() => setShowBlockDialog(true)} 
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-medium text-sm transition-colors cursor-pointer group"
                                >
                                    <Ban className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                                    <span>Block User</span>
                                </button>
                                <button 
                                    onClick={() => setShowClearDialog(true)} 
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-medium text-sm transition-colors cursor-pointer group"
                                >
                                    <Trash2 className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                                    <span>Clear Chat</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Block Confirmation Dialog */}
                    {showBlockDialog && (
                        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fade-in_0.2s_ease-out]">
                            <div className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                                    <Ban className="w-6 h-6" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-bold text-[var(--ui-text)]">Block {otherName}?</h3>
                                    <p className="text-xs text-[var(--ui-text-muted)] leading-relaxed">
                                        They will no longer be able to send you messages or see your presence. You can unblock them at any time.
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setShowBlockDialog(false)}
                                        disabled={isActionPending}
                                        className="flex-1 py-2.5 rounded-xl border border-[var(--ui-border)] text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBlockUser}
                                        disabled={isActionPending}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-md shadow-red-600/20 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {isActionPending ? 'Blocking...' : 'Block'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clear Chat Confirmation Dialog */}
                    {showClearDialog && (
                        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fade-in_0.2s_ease-out]">
                            <div className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-bold text-[var(--ui-text)]">Clear Entire Chat?</h3>
                                    <p className="text-xs text-[var(--ui-text-muted)] leading-relaxed">
                                        This will permanently delete all messages and shared attachments in this conversation. This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setShowClearDialog(false)}
                                        disabled={isActionPending}
                                        className="flex-1 py-2.5 rounded-xl border border-[var(--ui-border)] text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleClearChat}
                                        disabled={isActionPending}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-md shadow-red-600/20 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {isActionPending ? 'Clearing...' : 'Clear All'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}
