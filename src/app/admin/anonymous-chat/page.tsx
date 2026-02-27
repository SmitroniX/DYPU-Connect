'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnonChatLog {
    id: string;
    messageId: string;
    userId: string;
    email: string;
    text: string;
    gifUrl?: string;
    sessionId: string;
    timestamp: Timestamp | null;
}

export default function AdminAnonChatPage() {
    const [logs, setLogs] = useState<AnonChatLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'anonymous_public_chat_private'), orderBy('timestamp', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const data: AnonChatLog[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<AnonChatLog, 'id'>),
            }));
            setLogs(data);
        } catch {
            toast.error('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.5s_ease-out]">
            <div className="mb-8 glass border-purple-500/20 bg-purple-500/5 p-6 flex items-start gap-4">
                <div className="p-3 bg-purple-500/15 rounded-xl shrink-0">
                    <Terminal className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Shadow Realm Oversight</h1>
                    <p className="text-sm text-purple-300/80 mt-1">
                        Monitoring stream for Anonymous Public Chat. Real email addresses attached to masked messages.
                    </p>
                </div>
            </div>

            <div className="glass overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Decrypting streams...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-purple-500/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase">Target Identity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase">Message Content</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase">Time Intercepted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-purple-500/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-red-400 font-mono tracking-tight">{log.email}</span>
                                            <div className="text-[10px] text-slate-600">UID: {log.userId}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-300 max-w-xl truncate" title={log.text}>{log.text}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500">No shadow messages intercepted.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
