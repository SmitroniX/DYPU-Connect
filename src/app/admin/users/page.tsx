'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Ban, CheckCircle, Search, Shield, UserCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { resolveProfileImage } from '@/lib/profileImage';
import { isSuperAdmin } from '@/lib/admin';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { useStore } from '@/store/useStore';

interface UserData {
    id: string;
    name: string;
    email: string;
    profileImage: string;
    field: string;
    branch: string;
    year: string;
    division: string;
    gender: string;
    role: string;
    status: string;
    createdAt: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterField, setFilterField] = useState('all');
    const [filterYear, setFilterYear] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const { userProfile } = useStore();
    const currentIsSuperAdmin = isSuperAdmin(userProfile?.email);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await cacheGet<UserData[]>('admin_users', async () => {
                const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UserData[];
            }, { ttl: 60_000, swr: 300_000 });
            setUsers(data);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'banned' : 'active';
        try {
            await updateDoc(doc(db, 'users', userId), { status: newStatus });
            cacheInvalidate('admin_users');
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            toast.success(`User has been ${newStatus === 'banned' ? 'banned' : 'unbanned'}.`);
        } catch {
            toast.error('Failed to update user status');
        }
    };

    const toggleUserRole = async (userId: string, currentRole: string) => {
        if (!currentIsSuperAdmin) {
            toast.error('Only the super-admin can change user roles.');
            return;
        }
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            cacheInvalidate('admin_users');
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast.success(`User role changed to ${newRole}.`);
        } catch {
            toast.error('Failed to update user role');
        }
    };

    // Get unique fields and years for filter dropdowns
    const uniqueFields = [...new Set(users.map(u => u.field).filter(Boolean))].sort();
    const uniqueYears = [...new Set(users.map(u => u.year).filter(Boolean))].sort();

    const filteredUsers = users.filter(u => {
        const matchesSearch = !searchQuery ||
            u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesField = filterField === 'all' || u.field === filterField;
        const matchesYear = filterYear === 'all' || u.year === filterYear;
        const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
        return matchesSearch && matchesField && matchesYear && matchesStatus;
    });

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="mb-6 surface border-[var(--ui-accent)]/20 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                    <Users className="h-5 w-5 text-[var(--ui-accent)]" />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">User Management</h1>
                    <p className="text-sm text-[var(--ui-accent)]/70 mt-1">
                        {loading ? 'Loading...' : `${filteredUsers.length} of ${users.length} users`}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="surface p-4 mb-6 space-y-3">
                {/* Search */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                    </div>
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filter Row */}
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        className="rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2 text-sm text-[var(--ui-text)] focus:outline-none transition-all appearance-none"
                    >
                        <option value="all">All Fields</option>
                        {uniqueFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2 text-sm text-[var(--ui-text)] focus:outline-none transition-all appearance-none"
                    >
                        <option value="all">All Years</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="rounded-lg bg-[var(--ui-bg-input)] border-none px-3 py-2 text-sm text-[var(--ui-text)] focus:outline-none transition-all appearance-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="surface overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                        <p className="text-sm text-[var(--ui-text-muted)]">Loading users...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--ui-divider)]">
                            <thead className="bg-[var(--ui-bg-elevated)]">
                                <tr>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Academic Info</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Joined</th>
                                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ui-divider)]">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-[var(--ui-bg-hover)] transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    className="h-9 w-9 rounded-xl object-cover object-center ring-1 ring-[var(--ui-border)]"
                                                    src={resolveProfileImage(user.profileImage, user.email, user.name)}
                                                    alt=""
                                                />
                                                <div className="max-w-50">
                                                    <p className="text-sm font-medium text-[var(--ui-text)] truncate">{user.name}</p>
                                                    <p className="text-xs text-[var(--ui-text-muted)] truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-sm text-[var(--ui-text-secondary)]">{user.field}</p>
                                            <p className="text-xs text-[var(--ui-text-muted)]">
                                                {user.branch ? `${user.branch} · ` : ''}{user.year} · Div {user.division}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                                                user.role === 'admin'
                                                    ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20'
                                                    : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)]'
                                            }`}>
                                                {user.role === 'admin' && <Shield className="h-3 w-3" />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                                                user.status === 'active'
                                                    ? 'bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]/20'
                                                    : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                                            }`}>
                                                {user.status === 'active' ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-[var(--ui-text-muted)]">
                                                {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => toggleUserRole(user.id, user.role)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] transition-colors"
                                                    title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                                                >
                                                    <Shield className="h-3 w-3" />
                                                    {user.role === 'admin' ? 'Demote' : 'Promote'}
                                                </button>
                                                <button
                                                    onClick={() => toggleUserStatus(user.id, user.status)}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                        user.status === 'active'
                                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                                                            : 'bg-[var(--ui-accent-dim)] border border-[var(--ui-accent)]/20 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20'
                                                    }`}
                                                >
                                                    {user.status === 'active' ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                                    {user.status === 'active' ? 'Ban' : 'Unban'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400">No users found</p>
                                            <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filters</p>
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
