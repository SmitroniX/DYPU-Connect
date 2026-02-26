'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAnonChatPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'anonymous_public_chat_private'), orderBy('timestamp', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(data);
        } catch (error) {
            toast.error('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans truncate">
            <div className="mb-8 p-6 bg-gray-900 border border-gray-800 flex items-start gap-4 rounded-2xl shadow-sm text-white">
                <div className="p-3 bg-purple-900 rounded-lg shrink-0">
                    <Terminal className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Shadow Realm Oversight</h1>
                    <p className="text-sm text-gray-400">
                        Monitoring stream for Anonymous Public Chat. Real email addresses attached to masked messages.
                    </p>
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Decrypting streams...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-purple-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-purple-900 uppercase">Target Identity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-purple-900 uppercase">Message Content</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-purple-900 uppercase">Time Intercepted</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-purple-50 hover:bg-opacity-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap flex flex-col justify-center">
                                            <span className="text-sm font-bold text-red-600 font-mono tracking-tight">{log.email}</span>
                                            <span className="text-[10px] text-gray-400">UID: {log.userId}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-800 max-w-xl truncate" title={log.text}>
                                            {log.text}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                                            No shadow messages intercepted.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
