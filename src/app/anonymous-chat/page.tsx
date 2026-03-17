'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleGuard from '@/components/ModuleGuard';
import ChannelHeader from '@/components/ChannelHeader';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, setDoc, doc, updateDoc, Timestamp as FirestoreTimestamp, where } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { MessageHoverToolbar, MessageReactions } from '@/components/MessageReactions';
import { EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { generateAnonymousName } from '@/lib/utils';
import { sanitiseInput, filterProfanity } from '@/lib/security';
import toast from 'react-hot-toast';

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

export default function AnonymousChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const { user } = useAuth();
    const { userProfile } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Track this session's anonymous identity. To keep it consistent across a session.
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const now = new Date();
        const q = query(
            collection(db, 'anonymous_public_chat'),
            where('expiresAt', '>', FirestoreTimestamp.fromDate(now)),
            orderBy('expiresAt', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Message[];
                data.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
                setMessages(data);
                scrollToBottom();
            },
            (error) => {
                console.error('Anonymous chat listener error:', error);
            }
        );

        return () => unsubscribe();
    }, []);



    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

        // 2. Map to Private Doc
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
            <div className="h-full flex flex-col">
                <ChannelHeader name="shadow-realm" description="Anonymous public chat — admins have oversight">
                    <span className="badge text-[var(--ui-accent)]">
                        <EyeOff className="h-3 w-3" />
                        {sessionIdentity || 'Connecting...'}
                    </span>
                </ChannelHeader>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                <EyeOff className="h-8 w-8 text-[var(--ui-text-muted)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">Welcome to #shadow-realm!</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">Silence in the shadows. Speak up. 👁️</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMine = msg.sessionId === sessionId || (!!msg.senderId && msg.senderId === user?.uid);
                            const prev = i > 0 ? messages[i - 1] : null;
                            const showHeader = !prev || prev.anonymousName !== msg.anonymousName;
                            const ts = msg.timestamp?.toDate?.();

                            return (
                                <div key={msg.id} className={`group relative flex w-full px-2 py-1 transition-colors hover:bg-[var(--ui-bg-hover)]/30 rounded-xl ${showHeader ? 'mt-4' : 'mt-0.5'}`}>
                                    <MessageHoverToolbar onReact={(emoji) => handleReact(msg.id, emoji)} />

                                    <div className="flex gap-4 w-full">
                                        <div className="w-10 shrink-0 flex items-start pt-1">
                                            {showHeader ? (
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isMine ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)]' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)]'}`}>
                                                    {msg.anonymousName.charAt(0)}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity w-full text-center pt-1 font-medium">
                                                    {ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5 pb-1">
                                            {showHeader && (
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span className={`font-semibold text-[15px] ${isMine ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'}`}>
                                                        {msg.anonymousName}
                                                        {isMine && <span className="text-xs text-[var(--ui-text-muted)] ml-1">(you)</span>}
                                                    </span>
                                                    <span className="text-xs text-[var(--ui-text-muted)] font-medium">
                                                        {ts ? formatDistanceToNow(ts as Date, { addSuffix: true }) : 'Sending...'}
                                                    </span>
                                                </div>
                                            )}
                                            {msg.gifUrl && (
                                                <img src={msg.gifUrl} alt="GIF" className="max-w-[80%] sm:max-w-[340px] rounded-xl mt-1.5 mb-1 object-cover shadow-sm" />
                                            )}
                                            {msg.imageUrl && (
                                                <img src={msg.imageUrl} alt="Photo" className="max-w-[80%] sm:max-w-[340px] rounded-xl mt-1.5 mb-1 object-cover border border-[var(--ui-border)]/50 shadow-sm" />
                                            )}
                                            {msg.text && (
                                                <p className="text-[15px] text-[var(--ui-text-secondary)] leading-relaxed break-words whitespace-pre-wrap">
                                                    {renderMarkdown(filterProfanity(msg.text))}
                                                </p>
                                            )}
                                            <div className="mt-1">
                                                <MessageReactions
                                                    reactions={msg.reactions ?? {}}
                                                    currentUserId={user?.uid ?? ''}
                                                    onToggle={(emoji) => handleReact(msg.id, emoji)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat input — no image upload in anonymous mode */}
                <ChatInput
                    onSend={handleSend}
                    placeholder={`Message as ${sessionIdentity}...`}
                    features={{ emoji: true, gif: true, image: false, markdown: true }}
                />
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
