'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { AlertTriangle, Eye, Search, Trash2 } from 'lucide-react';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { logAdminAction } from '@/lib/auditLog';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface PrivateConfession {
    id: string;
    confessionId: string;
    userId: string;
    email: string;
    realName: string;
    anonymousName: string;
    createdAt: Timestamp | null;
    text?: string;
}

export default function AdminConfessionsPage() {
    const [logs, setLogs] = useState<(PrivateConfession & { text: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { user } = useAuth();
    const { userProfile } = useStore();

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const combined = await cacheGet<(PrivateConfession & { text: string })[]>(
                'admin_confessions',
                async () => {
                    const q = query(collection(db, 'confessions_private'), orderBy('createdAt', 'desc'), limit(200));
                    const snapshot = await getDocs(q);
                    const privateData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PrivateConfession[];

                    const pubQ = query(collection(db, 'confessions_public'), limit(500));
                    const pubSnapshot = await getDocs(pubQ);
                    const publicDataMap = pubSnapshot.docs.reduce((acc, d) => {
                        acc[d.id] = d.data().text;
                        return acc;
                    }, {} as Record<string, string>);

                    return privateData.map(log => ({
                        ...log,
                        text: publicDataMap[log.confessionId] || '[Deleted or Not Found]'
                    }));
                },
                { ttl: 60_000, swr: 300_000 }
            );
            setLogs(combined);
        } catch (error) {
            console.error('error fetching logs', error);
            toast.error('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (log: PrivateConfession & { text: string }) => {
        if (!confirm(`Delete this confession by ${log.realName || log.email || 'Unknown'}?\n\nThis will remove both the public confession and the private tracking record. This cannot be undone.`)) return;

        setDeletingId(log.id);
        try {
            // Delete both public and private docs
            await Promise.all([
                deleteDoc(doc(db, 'confessions_public', log.confessionId)).catch(() => {}),
                deleteDoc(doc(db, 'confessions_private', log.id)),
            ]);

            // Audit log
            if (user && userProfile) {
                logAdminAction({
                    action: 'delete_confession',
                    adminUid: user.uid,
                    adminEmail: user.email ?? '',
                    adminName: userProfile.name,
                    targetId: log.confessionId,
                    targetType: 'confession',
                    details: `Deleted confession by ${log.realName || 'Unknown'} (${log.email || 'no email'}): "${log.text.slice(0, 100)}"`,
