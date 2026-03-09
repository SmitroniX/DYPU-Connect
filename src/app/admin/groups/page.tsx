'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, ChevronRight, ChevronDown, BookOpen, GraduationCap, Building, ShieldAlert, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveProfileImage } from '@/lib/profileImage';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    field: string;
    year: string;
    division: string;
    profileImage: string;
    role: string;
}

// Hierarchical Group Node
interface GroupNode {
    id: string; // The chat ID
    name: string;
    type: 'field' | 'year' | 'division';
    level: number;
    members: UserProfile[];
    children: Record<string, GroupNode>;
}

export default function AdminGroupsPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedGroup, setSelectedGroup] = useState<GroupNode | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, 'users'));
                const fetchedUsers: UserProfile[] = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.field && data.year && data.division) {
                        fetchedUsers.push({
                            uid: doc.id,
                            name: data.name,
                            email: data.email,
                            field: data.field,
                            year: data.year,
                            division: data.division,
                            profileImage: data.profileImage || '',
                            role: data.role || 'student',
                        });
                    }
                });
                setUsers(fetchedUsers);
            } catch (error) {
                console.error('Failed to fetch users:', error);
                toast.error('Failed to load groups data');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const hierarchy = useMemo(() => {
        const root: Record<string, GroupNode> = {};

        users.forEach(user => {
            // Field Level
            const fieldId = `field_${user.field.replace(/\s+/g, '_')}`;
            if (!root[fieldId]) {
                root[fieldId] = { id: fieldId, name: user.field, type: 'field', level: 0, members: [], children: {} };
            }
            root[fieldId].members.push(user);

            // Year Level
            const yearId = `year_${user.field.replace(/\s+/g, '_')}_${user.year.replace(/\s+/g, '_')}`;
            if (!root[fieldId].children[yearId]) {
                root[fieldId].children[yearId] = { id: yearId, name: `${user.field} - ${user.year}`, type: 'year', level: 1, members: [], children: {} };
            }
            root[fieldId].children[yearId].members.push(user);

            // Division Level
            const divId = `division_${user.field.replace(/\s+/g, '_')}_${user.year.replace(/\s+/g, '_')}_${user.division}`;
            if (!root[fieldId].children[yearId].children[divId]) {
                root[fieldId].children[yearId].children[divId] = { id: divId, name: `Div ${user.division}`, type: 'division', level: 2, members: [], children: {} };
            }
            root[fieldId].children[yearId].children[divId].members.push(user);
        });

        // Initially expand all fields
        const initialExpanded = new Set<string>();
        Object.keys(root).forEach(k => initialExpanded.add(k));
        setExpandedNodes(initialExpanded);

        return root;
    }, [users]);

    const toggleNode = (id: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedNodes(newExpanded);
    };

    const handleClearChat = async (groupId: string) => {
        if (!confirm('Are you sure you want to clear the chat history for this group? This cannot be undone.')) return;
        
        toast.error('Chat clearing logic will be implemented here (Requires Cloud Function to delete subcollection).');
        // Due to Firestore limits on the client, deleting a large subcollection (like group_messages)
        // should typically be done via a Cloud Function or batch writes.
    };

    const renderNode = (node: GroupNode) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = Object.keys(node.children).length > 0;
        const isSelected = selectedGroup?.id === node.id;

        return (
            <div key={node.id} className={`ml-${node.level * 4} mt-1`}>
                <div 
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-[var(--ui-accent)]/10 ring-1 ring-[var(--ui-accent)]/30' : 'hover:bg-[var(--ui-bg-hover)]'
                    }`}
                    onClick={() => setSelectedGroup(node)}
                >
                    {hasChildren ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }} className="p-0.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <div className="w-5" /> // Spacer
                    )}
                    
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--ui-accent-dim)] shrink-0">
                        {node.type === 'field' && <BookOpen className="h-3 w-3 text-[var(--ui-accent)]" />}
                        {node.type === 'year' && <GraduationCap className="h-3 w-3 text-[var(--ui-accent)]" />}
                        {node.type === 'division' && <Building className="h-3 w-3 text-[var(--ui-accent)]" />}
                    </div>
                    
                    <span className={`text-sm font-medium ${isSelected ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'}`}>
                        {node.name}
                    </span>
                    <span className="text-xs text-[var(--ui-text-muted)] ml-auto bg-[var(--ui-bg-elevated)] px-2 py-0.5 rounded-full">
                        {node.members.length} member{node.members.length !== 1 && 's'}
                    </span>
                </div>

                {isExpanded && hasChildren && (
                    <div className="border-l border-[var(--ui-border)] ml-3 pl-3 mt-1">
                        {Object.values(node.children).map(renderNode)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ui-text)] flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20">
                            <Users className="h-5 w-5 text-[var(--ui-accent)]" />
                        </span>
                        Group Management
                    </h1>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Explore the auto-generated campus hierarchy and manage group chats.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hierarchy Tree */}
                <div className="lg:col-span-1 surface p-5 rounded-lg border border-[var(--ui-border)] shadow-sm h-[70vh] flex flex-col">
                    <h2 className="text-sm font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--ui-border)] pb-3">
                        Campus Structure
                    </h2>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <LoadingSpinner />
                            </div>
                        ) : Object.keys(hierarchy).length === 0 ? (
                            <p className="text-sm text-[var(--ui-text-muted)] text-center py-10">No users or groups found.</p>
                        ) : (
                            Object.values(hierarchy).map(renderNode)
                        )}
                    </div>
                </div>

                {/* Selected Group Details */}
                <div className="lg:col-span-2 surface p-6 rounded-lg border border-[var(--ui-border)] shadow-sm h-[70vh] flex flex-col">
                    {selectedGroup ? (
                        <>
                            <div className="flex items-start justify-between border-b border-[var(--ui-border)] pb-4 mb-4 shrink-0">
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--ui-text)]">{selectedGroup.name}</h2>
                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <span className="text-xs font-semibold text-[var(--ui-accent)] bg-[var(--ui-accent)]/10 px-2 py-1 rounded">
                                            {selectedGroup.type.toUpperCase()} LEVEL
                                        </span>
                                        <span className="text-xs text-[var(--ui-text-muted)]">
                                            ID: <code className="bg-[var(--ui-bg-elevated)] px-1 py-0.5 rounded">{selectedGroup.id}</code>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a 
                                        href={`/groups/${selectedGroup.id}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] transition-colors"
                                    >
                                        Jump to Chat
                                    </a>
                                    <button 
                                        onClick={() => handleClearChat(selectedGroup.id)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Clear Chat
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <h3 className="text-sm font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-4">
                                    Members ({selectedGroup.members.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedGroup.members.map(member => (
                                        <div key={member.uid} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] hover:border-[var(--ui-accent)]/30 transition-colors">
                                            <img 
                                                src={resolveProfileImage(member.profileImage, undefined, member.name)} 
                                                alt="" 
                                                className="w-10 h-10 rounded-full object-cover shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-[var(--ui-text)] truncate">{member.name}</p>
                                                <p className="text-xs text-[var(--ui-text-muted)] truncate">{member.email}</p>
                                            </div>
                                            {member.role === 'admin' && (
                                                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-[var(--ui-text-muted)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--ui-text)]">Select a Group</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1 max-w-sm">
                                Click on any field, year, or division from the structure tree to view its members and manage the group.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
