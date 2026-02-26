'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { Shield, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface PrivateConfession {
    id: string;
    confessionId: string;
    userId: string;
    email: string;
    realName: string;
    anonymousName: string;
    createdAt: any;
    text?: string; // Will fetch from public
}

export default function AdminConfessionsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Fetch private mappings
            const q = query(collection(db, 'confessions_private'), orderBy('createdAt', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const privateData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrivateConfession[];

            // Now fetch public confessions to get the text. In production this would be joined differently.
            const pubQ = query(collection(db, 'confessions_public'), limit(200));
            const pubSnapshot = await getDocs(pubQ);
            const publicDataMap = pubSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data().text;
                return acc;
            }, {} as Record<string, string>);

            const combined = privateData.map(log => ({
                ...log,
                text: publicDataMap[log.confessionId] || '[Deleted or Not Found]'
            }));

            setLogs(combined);
        } catch (error) {
            console.error("error fetching logs", error)
            toast.error('Failed to load tracking data. Make sure indexing is done or rules are permitting.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans">
            <div className="mb-8 p-6 bg-red-50 border border-red-100 flex items-start gap-4 rounded-2xl shadow-sm">
                <div className="p-3 bg-red-100 rounded-full shrink-0">
                    <EyeOff className="w-6 h-6 text-red-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-red-900">Confession Tracker</h1>
                    <p className="mt-1 text-sm text-red-700">
                        Warning: Highly sensitive area. Real identities associated with anonymous confessions are exposed below. Use strictly for moderation.
                    </p>
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading tracking logs...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Real Identity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Anonymous Alias</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Confession Content</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-red-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                            <div className="font-bold text-red-600">{log.realName}</div>
                                            <div className="text-gray-500 text-xs">{log.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap font-mono bg-gray-50">
                                            {log.anonymousName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate" title={log.text}>
                                            {log.text}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                                            No confession logs found.
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
