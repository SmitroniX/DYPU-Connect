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
            <div className="mb-6 glass border-sky-500/20 bg-sky-500/5 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-500/20 shrink-0">
                    <Users className="h-5 w-5 text-sky-400" />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-white">User Management</h1>
                    <p className="text-sm text-sky-300/70 mt-1">
                        {loading ? 'Loading...' : `${filteredUsers.length} of ${users.length} users`}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass p-4 mb-6 space-y-3">
                {/* Search */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/30 transition-all"
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
                        className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/30 transition-all appearance-none"
                    >
                        <option value="all">All Fields</option>
                        {uniqueFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/30 transition-all appearance-none"
                    >
                        <option value="all">All Years</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/30 transition-all appearance-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
                        <p className="text-sm text-slate-500">Loading users...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-white/5">
                                <tr>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Academic Info</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    className="h-9 w-9 rounded-xl object-cover object-center ring-1 ring-white/10"
                                                    src={resolveProfileImage(user.profileImage, user.email, user.name)}
                                                    alt=""
                                                />
                                                <div className="max-w-50">
                                                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-sm text-slate-300">{user.field}</p>
                                            <p className="text-xs text-slate-500">
                                                {user.branch ? `${user.branch} · ` : ''}{user.year} · Div {user.division}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                                                user.role === 'admin'
                                                    ? 'bg-sky-300/15 text-sky-300 ring-1 ring-sky-300/20'
                                                    : 'bg-white/10 text-slate-400'
                                            }`}>
                                                {user.role === 'admin' && <Shield className="h-3 w-3" />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                                                user.status === 'active'
                                                    ? 'bg-sky-300/15 text-sky-300 ring-1 ring-sky-300/20'
                                                    : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                                            }`}>
                                                {user.status === 'active' ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs text-slate-500">
                                                {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => toggleUserRole(user.id, user.role)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                                                    title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                                                >
                                                    <Shield className="h-3 w-3" />
                                                    {user.role === 'admin' ? 'Demote' : 'Promote'}
                                                </button>
                                                <button
                                                    onClick={() => toggleUserStatus(user.id, user.status)}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        user.status === 'active'
                                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                                                            : 'bg-sky-300/10 border border-sky-300/20 text-sky-300 hover:bg-sky-300/20'
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
