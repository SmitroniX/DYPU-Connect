'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import { Send, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: any;
}

export default function PrivateChatDetail({ params }: { params: { chatId: string } }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatInfo, setChatInfo] = useState<any>(null);

    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch chat info (participants)
        const fetchChatInfo = async () => {
            const docSnap = await getDoc(doc(db, 'private_chats', params.chatId));
            if (docSnap.exists()) {
                setChatInfo(docSnap.data());
            }
        };
        fetchChatInfo();

        // Listen to messages
        const q = query(
            collection(db, 'private_messages', params.chatId, 'messages'),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(data);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [params.chatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        setLoading(true);
        try {
            const msgText = newMessage.trim();
            setNewMessage('');

            // Add message
            await addDoc(collection(db, 'private_messages', params.chatId, 'messages'), {
                text: msgText,
                senderId: user.uid,
                timestamp: serverTimestamp(),
            });

            // Update last message in chat info
            await updateDoc(doc(db, 'private_chats', params.chatId), {
                lastMessage: msgText,
                updatedAt: serverTimestamp()
            });

        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!chatInfo || !user) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const otherUserId = chatInfo.participants.find((id: string) => id !== user.uid) || '';
    const otherName = chatInfo.participantNames?.[otherUserId] || 'User';
    const otherImage = chatInfo.participantImages?.[otherUserId];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col font-sans">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 p-4 shrink-0 flex items-center gap-4">
                    <Link href="/messages" className="text-gray-400 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <img src={otherImage} alt={otherName} className="w-10 h-10 rounded-full border border-gray-100" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{otherName}</h2>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-gray-50 border-l border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="m-auto text-gray-400 text-sm text-center">
                            <span className="block mb-2">👋</span>
                            Start the conversation with {otherName}
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[75%] gap-2 flex-col`}>
                                        <div className={`px-4 py-2 rounded-2xl ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100 shadow-sm'}`}>
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                        </div>
                                        <span className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                                            {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white p-3 rounded-b-xl shadow-sm border border-gray-200 shrink-0">
                    <form className="flex gap-2" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow text-sm"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || !newMessage.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors flex shrink-0 items-center justify-center w-10 h-10"
                        >
                            <Send className="w-4 h-4 text-white hover:text-white" />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
