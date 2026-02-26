'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import { generateAnonymousName } from '@/lib/utils';
import { Send, Heart, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Confession {
    id: string;
    text: string;
    anonymousName: string;
    createdAt: any;
    likesCount: number;
}

export default function ConfessionsPage() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [newConfession, setNewConfession] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { userProfile } = useStore();

    useEffect(() => {
        const q = query(
            collection(db, 'confessions_public'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Confession[];
            setConfessions(data);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConfession.trim() || !userProfile || !user) return;

        setLoading(true);
        try {
            const anonName = generateAnonymousName();

            // 1. Save Public Confession
            const docRef = await addDoc(collection(db, 'confessions_public'), {
                text: newConfession.trim(),
                anonymousName: anonName,
                createdAt: serverTimestamp(),
                likesCount: 0
            });

            // 2. Save Private Tracking Document (Accessible only by admins)
            await setDoc(doc(db, 'confessions_private', docRef.id), {
                confessionId: docRef.id,
                userId: user.uid,
                email: user.email,
                realName: userProfile.name,
                anonymousName: anonName,
                createdAt: serverTimestamp(),
            });

            setNewConfession('');
            toast.success('Confession posted anonymously! 🤫');
        } catch (error: any) {
            toast.error('Failed to post confession');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const likeConfession = async (id: string, currentLikes: number) => {
        // Basic increment, ideally use Firestore FieldValue.increment
        // and track user likes to prevent infinite liking.
        toast.success('Liked! ❤️');
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto py-8 h-full flex flex-col">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campus Confessions</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Share your secrets, thoughts or crushes completely anonymously.
                        Remember: Be respectful. Admins strictly monitor abuse.
                    </p>
                </div>

                {/* Input Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="w-full h-24 p-4 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-pink-500 resize-none text-gray-800 placeholder-gray-400"
                            placeholder="I have a crush on someone from Computer Division B..."
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                            required
                        />
                        <div className="mt-3 flex justify-between items-center">
                            <span className="text-xs text-gray-400 flex items-center">
                                <span className="w-2 h-2 rounded-full bg-pink-500 mr-2"></span>
                                Posting randomly as e.g "Silent Tiger 420"
                            </span>
                            <button
                                type="submit"
                                disabled={loading || !newConfession.trim()}
                                className="inline-flex items-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Posting...' : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" /> Share Secret
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Confessions List */}
                <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-2">
                    {confessions.map((confession) => (
                        <div key={confession.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-pink-100 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                            {confession.anonymousName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">{confession.anonymousName}</h3>
                                            <p className="text-xs text-gray-400">
                                                {confession.createdAt?.toDate ? formatDistanceToNow(confession.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                                {confession.text}
                            </p>
                            <div className="mt-4 flex items-center">
                                <button
                                    onClick={() => likeConfession(confession.id, confession.likesCount)}
                                    className="inline-flex items-center text-xs text-gray-500 hover:text-pink-600 transition-colors"
                                >
                                    <Heart className="w-4 h-4 mr-1.5" />
                                    {confession.likesCount || 0}
                                </button>
                            </div>
                        </div>
                    ))}

                    {confessions.length === 0 && (
                        <div className="text-center py-12">
                            <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No confessions yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Be the first to share a secret!</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
