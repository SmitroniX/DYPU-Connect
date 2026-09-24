'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
import ChannelHeader from '@/components/ChannelHeader';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, setDoc, doc, updateDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import { 
    EyeOff, 
    ShieldCheck, 
    Clock, 
    Ghost, 
    VenetianMask, 
    Bot, 
    Sparkles, 
    ChevronDown, 
    X,
    ShieldAlert
} from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { formatDistanceToNow, format } from 'date-fns';
import { generateAnonymousName } from '@/lib/utils';
import { sanitiseInput, filterProfanity } from '@/lib/security';
import { ChatMessageListSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    text: string;
    anonymousName: string;
    gifUrl?: string;
    imageUrl?: string;
    reactions?: Record<string, string[]>;
    timestamp?: Timestamp | null;
    expiresAt?: Timestamp | null;
    sessionId?: string;
    senderId?: string;
}

const PASTEL_BADGES = [
    {
        gradient: 'from-emerald-400/20 via-teal-500/15 to-emerald-600/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        avatarBg: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    },
    {
        gradient: 'from-purple-400/20 via-fuchsia-500/15 to-indigo-600/20',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        avatarBg: 'bg-purple-500/15 text-purple-400 ring-purple-500/30',
    },
    {
        gradient: 'from-cyan-400/20 via-sky-500/15 to-blue-600/20',
        border: 'border-cyan-500/30',
        text: 'text-cyan-300',
        avatarBg: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
    },
    {
        gradient: 'from-amber-400/20 via-orange-500/15 to-yellow-600/20',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        avatarBg: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    },
    {
        gradient: 'from-rose-400/20 via-pink-500/15 to-rose-600/20',
        border: 'border-rose-500/30',
        text: 'text-rose-300',
        avatarBg: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
    },
    {
        gradient: 'from-violet-400/20 via-purple-500/15 to-fuchsia-600/20',
        border: 'border-violet-500/30',
        text: 'text-violet-300',
        avatarBg: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
    }
];

function getBadgeStyle(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % PASTEL_BADGES.length;
    return PASTEL_BADGES[idx];
}

function getDisguiseIcon(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 3) - hash);
    }
    const icons = [Ghost, VenetianMask, Bot, EyeOff, Sparkles];
    return icons[Math.abs(hash) % icons.length];
}

export default function AnonymousChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const { user } = useAuth();
    const { userProfile } = useStore();
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Track this session's anonymous identity
    const [sessionIdentity, setSessionIdentity] = useState('');
    const [sessionId, setSessionId] = useState('');

    useEffect(() => {
        if (!sessionIdentity) {
            queueMicrotask(() => setSessionIdentity(generateAnonymousName()));
        }
    }, [sessionIdentity]);

    useEffect(() => {
        if (!sessionId) {
            queueMicrotask(() => setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`));
        }
    }, [sessionId]);

    useEffect(() => {
        const now = new Date();
        const q = query(
            collection(db, 'anonymous_public_chat'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                })) as Message[];
                
                const filtered = data.filter(msg => {
                    const expiresAt = msg.expiresAt?.toDate?.();
                    return !expiresAt || expiresAt > now;
                });
                
                setMessages(filtered);
                setLoading(false);
            },
            (error) => {
                console.error('Anonymous chat listener error:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        virtuosoRef.current?.scrollToIndex({
            index: messages.length - 1,
            align: 'end',
            behavior: 'smooth'
        });
    };

    const handleSend = useCallback(async (payload: ChatInputPayload) => {
        const cleanMessage = sanitiseInput(payload.text);
        if ((!cleanMessage && !payload.gifUrl && !payload.imageUrl) || !userProfile || !user) return;

        const expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + 48);

        // 1. Create Public Doc
        const docRef = await addDoc(collection(db, 'anonymous_public_chat'), {
            text: cleanMessage,
            gifUrl: payload.gifUrl || null,
            imageUrl: payload.imageUrl || null,
            anonymousName: sessionIdentity,
            timestamp: serverTimestamp(),
            expiresAt: FirestoreTimestamp.fromDate(expireDate),
            sessionId,
        });

        // 2. Map to Private Doc for safety audit
        await setDoc(doc(db, 'anonymous_public_chat_private', docRef.id), {
            messageId: docRef.id,
            userId: user.uid,
            email: user.email,
            text: cleanMessage,
            gifUrl: payload.gifUrl || null,
            imageUrl: payload.imageUrl || null,
            sessionId,
            timestamp: serverTimestamp(),
        });
    }, [user, userProfile, sessionIdentity, sessionId]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        if (!user) return;
        const msgRef = doc(db, 'anonymous_public_chat', messageId);
        const msg = messages.find((m) => m.id === messageId);
        const reactions = msg?.reactions ?? {};
        const current = reactions[emoji] ?? [];
        const hasReacted = current.includes(user.uid);
        const updated = hasReacted ? current.filter((uid) => uid !== user.uid) : [...current, user.uid];
        const newReactions = { ...reactions };
        if (updated.length === 0) delete newReactions[emoji];
        else newReactions[emoji] = updated;
        updateDoc(msgRef, { reactions: newReactions }).catch(() => toast.error('Failed to react.'));
    }, [messages, user]);

    return (
        <DashboardLayout>
            <ModuleGuard moduleKey="disableAnonymousChat" moduleName="Anonymous Chat">
            {/* Subtle dark glass styling with purple/emerald stealth accent */}
            <div className="h-full flex flex-col bg-[var(--ui-bg-base)] relative overflow-hidden select-text">
                {/* Stealth background gradient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(168,85,247,0.07),rgba(16,185,129,0.04),transparent)] pointer-events-none" />

                {/* Header with Anonymity Safety Reminder Pill and Countdown/Rules Trigger */}
                <ChannelHeader 
                    name="shadow-realm" 
                    description="Anonymous campus chat • Ephemeral 48h purge"
                >
                    <div className="flex items-center gap-2">
                        {/* Anonymity Safety Reminder Pill */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md shadow-xs select-none">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden md:inline">Protected • Identity Hidden</span>
                            <span className="md:hidden">Protected</span>
                        </div>

                        {/* Countdown / Rules Trigger */}
                        <button
                            onClick={() => setShowRulesModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all cursor-pointer shadow-xs select-none"
                            title="48h Purge & Anonymity Rules"
                        >
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            <span className="hidden sm:inline">48h Rules</span>
                            <span className="sm:hidden">Rules</span>
                        </button>

                        {/* Disguise Name Badge */}
                        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ui-bg-surface)]/80 text-[var(--ui-accent)] border border-[var(--ui-border)] backdrop-blur-md shadow-xs">
                            <EyeOff className="w-3.5 h-3.5" />
                            <span className="font-mono text-[11px]">{sessionIdentity || 'Disguising...'}</span>
                        </div>
                    </div>
                </ChannelHeader>

                {/* Virtualized message list with smooth fade-in entrance */}
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
                            key="chat-messages"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 relative flex flex-col min-h-0 overflow-hidden"
                        >
                            <Virtuoso
                                ref={virtuosoRef}
                                data={messages}
                                initialTopMostItemIndex={Math.max(0, messages.length - 1)}
                                followOutput="auto"
                                atBottomStateChange={(bottom) => setIsAtBottom(bottom)}
                                className="flex-1 overflow-x-hidden px-4"
                                itemContent={(i, msg) => {
                                    const isMine = msg.sessionId === sessionId || (!!msg.senderId && msg.senderId === user?.uid);
                                    const prev = i > 0 ? messages[i - 1] : null;
                                    const showHeader = !prev || prev.anonymousName !== msg.anonymousName;
                                    const ts = msg.timestamp?.toDate?.();
                                    const badge = getBadgeStyle(msg.anonymousName);
                                    const DisguiseIcon = getDisguiseIcon(msg.anonymousName);

                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`group relative flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${
                                                showHeader ? 'mt-4' : 'mt-1'
                                            }`}
                                        >
                                            <div className={`flex gap-2.5 max-w-[92%] sm:max-w-[75%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                                
                                                {/* Distinct Anonymous Disguise Avatar */}
                                                <div className="w-8 sm:w-9 shrink-0 flex flex-col items-center justify-end pb-1">
                                                    {showHeader && (
                                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ring-2 shadow-md transition-transform hover:scale-105 ${badge.avatarBg}`}>
                                                            <DisguiseIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Message Bubble Container */}
                                                <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                    {/* Header with random pastel gradient badge */}
                                                    {showHeader && (
                                                        <div className="flex items-center gap-2 mb-1 ml-0.5">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border backdrop-blur-md bg-gradient-to-r ${badge.gradient} ${badge.border} ${badge.text} shadow-xs select-none`}>
                                                                <span>{msg.anonymousName}</span>
                                                                {isMine && <span className="text-[10px] opacity-75 font-normal">(you)</span>}
                                                            </span>
                                                            <span className="text-[10px] text-[var(--ui-text-muted)] font-medium">
                                                                {ts ? formatDistanceToNow(ts as Date, { addSuffix: true }) : 'Sending...'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Message bubble styling */}
                                                    <div
                                                        className={`
                                                            relative px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col min-w-[75px] backdrop-blur-xl transition-all
                                                            ${isMine 
                                                                ? 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-emerald-600/90 to-teal-700/90 text-white border border-emerald-500/30 shadow-md shadow-emerald-500/10' 
                                                                : 'rounded-2xl rounded-tl-sm bg-[var(--ui-bg-surface)]/85 text-[var(--ui-text)] border border-purple-500/20 shadow-md shadow-black/10 hover:border-purple-500/30'}
                                                        `}
                                                    >
                                                        {msg.gifUrl && (
                                                            <img 
                                                                src={msg.gifUrl} 
                                                                alt="GIF" 
                                                                className="max-w-[80%] sm:max-w-[320px] rounded-xl mb-1.5 object-cover shadow-sm ring-1 ring-black/10" 
                                                            />
                                                        )}
                                                        {msg.imageUrl && (
                                                            <img 
                                                                src={msg.imageUrl} 
                                                                alt="Photo" 
                                                                className="max-w-[80%] sm:max-w-[320px] rounded-xl mb-1.5 object-cover border border-[var(--ui-border)]/50 shadow-sm" 
                                                            />
                                                        )}
                                                        {msg.text && (
                                                            <p className={`text-[14px] sm:text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                                                                isMine ? 'text-white' : 'text-[var(--ui-text)]'
                                                            }`}>
                                                                {renderMarkdown(filterProfanity(msg.text))}
                                                            </p>
                                                        )}

                                                        {/* Timestamp indicator */}
                                                        <div className={`flex items-center gap-1 self-end ml-3 mt-1 text-[9px] font-medium tracking-tight select-none ${
                                                            isMine ? 'text-white/80' : 'text-[var(--ui-text-muted)]'
                                                        }`}>
                                                            <span>{ts ? format(ts, 'HH:mm') : ''}</span>
                                                        </div>
                                                    </div>

                                                    {/* Reactions & Hover Toolbar */}
                                                    <div className={`mt-0.5 flex flex-col ${isMine ? 'items-end' : 'items-start'} ${isMine ? 'pr-1' : 'pl-1'}`}>
                                                        <MessageReactions
                                                            reactions={msg.reactions ?? {}}
                                                            currentUserId={user?.uid ?? ''}
                                                            onToggle={(emoji) => handleReact(msg.id, emoji)}
                                                        />
                                                        <MessageHoverToolbar 
                                                            onReact={(emoji) => handleReact(msg.id, emoji)} 
                                                            isMine={isMine}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }}
                                components={{
                                    Header: () => (
                                        <>
                                            {messages.length === 0 && (
                                                <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-[fade-in-up_0.5s_ease-out]">
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-emerald-500/20 border border-purple-500/30 flex items-center justify-center mb-5 shadow-xl">
                                                        <EyeOff className="h-10 w-10 text-purple-400" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Welcome to #shadow-realm</h3>
                                                    <p className="text-sm text-[var(--ui-text-muted)] max-w-sm">
                                                        Speak candidly without judgment. Messages automatically purge after 48 hours.
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ),
                                    Footer: () => <div className="h-4" />
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
                                        className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--ui-bg-surface)]/90 hover:bg-[var(--ui-bg-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] shadow-xl backdrop-blur-xl transition-all cursor-pointer group"
                                        aria-label="Jump to bottom"
                                    >
                                        <ChevronDown className="w-4 h-4 text-purple-400 group-hover:translate-y-0.5 transition-transform" />
                                        <span className="text-xs font-bold">Latest</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat input — anonymous mode */}
                <div className="shrink-0 bg-gradient-to-t from-[var(--ui-bg-base)] via-[var(--ui-bg-base)]/80 to-transparent sticky bottom-0 z-20">
                    <div className="max-w-3xl mx-auto transition-all duration-300">
                        <div className="px-4 pb-1 flex justify-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-xs select-none">
                                🕵️ Anonymous Mask • All messages auto-expire in 48 hours
                            </span>
                        </div>
                        <ChatInput
                            onSend={handleSend}
                            placeholder={`Message as ${sessionIdentity}...`}
                            features={{ emoji: true, gif: true, image: false, markdown: true }}
                        />
                    </div>
                </div>

                {/* Anonymity Safety & 48h Countdown Modal */}
                {showRulesModal && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fade-in_0.2s_ease-out]">
                        <div className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--ui-border)]/50">
                                <div className="flex items-center gap-2 text-purple-400">
                                    <Clock className="w-5 h-5" />
                                    <h3 className="font-extrabold text-[var(--ui-text)] text-base">48-Hour Purge & Safety Rules</h3>
                                </div>
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="p-1 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs text-[var(--ui-text-muted)] leading-relaxed">
                                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
                                    <span className="font-bold block text-sm mb-1 text-purple-100">⏳ Ephemeral Lifespan:</span>
                                    Every message and reaction in this room is automatically and permanently purged 48 hours after being sent.
                                </div>

                                <div className="space-y-2">
                                    <div className="flex gap-2.5 items-start">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <p><strong className="text-[var(--ui-text)]">Masked Identity:</strong> Your peers only see your randomized disguise avatar and pseudonym.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <p><strong className="text-[var(--ui-text)]">Admin Oversight:</strong> To keep DYPU safe, abusive messages can be reported and mapped for administrative review.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                        <p><strong className="text-[var(--ui-text)]">Community Guidelines:</strong> No harassment, hate speech, threats, or illegal content.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="w-full py-2.5 rounded-xl bg-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/90 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
                                >
                                    Understood
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </ModuleGuard>
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
