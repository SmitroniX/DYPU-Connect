'use client';

import { X, Search, Image as ImageIcon, Bell, BellOff, Trash2, LogOut, Shield } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Group, GroupMessage } from '@/types/groups';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { resolveProfileImage } from '@/lib/profileImage';

interface GroupDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    messages: GroupMessage[];
    onSearchClick?: () => void;
    onLeaveGroup?: () => void;
    onRemoveMember?: (uid: string) => void;
    isMuted?: boolean;
    onToggleMute?: () => void;
}

export default function GroupDetailsDrawer({
    isOpen,
    onClose,
    group,
    messages,
    onSearchClick,
    onLeaveGroup,
    onRemoveMember,
    isMuted = false,
    onToggleMute
}: GroupDetailsDrawerProps) {
    const { user } = useAuth();
    const [memberProfiles, setMemberProfiles] = useState<Record<string, {name?: string, profileImage?: string, email?: string, field?: string, year?: string}>>({});
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        if (!isOpen || !group?.memberIds?.length) return;

        const fetchMembers = async () => {
            setLoadingMembers(true);
            try {
                const profiles: Record<string, {name?: string, profileImage?: string, email?: string, field?: string, year?: string}> = {};
                // Ideally, do this in chunks or from a batched query if member list is huge
                // For MVP, fetch individually 
                const promises = group.memberIds.slice(0, 50).map(uid => 
                    getDoc(doc(db, 'users', uid))
                );
                
                const snaps = await Promise.all(promises);
                snaps.forEach(snap => {
                    if (snap.exists()) {
                        profiles[snap.id] = snap.data() as {name?: string, profileImage?: string, email?: string, field?: string, year?: string};
                    }
                });
                
                setMemberProfiles(profiles);
            } catch (e) {
                console.error('Failed to fetch members:', e);
            } finally {
                setLoadingMembers(false);
            }
        };

        fetchMembers();
    }, [isOpen, group?.memberIds]);

    if (!isOpen) return null;

    // Extract all media messages
    const mediaMessages = messages.filter(m => m.imageUrl || m.gifUrl);
    
    return (
        <>
            {/* Backdrop for mobile */}
            <div 
                className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed lg:static top-0 right-0 h-full w-80 bg-[var(--ui-bg-surface)] border-l border-[var(--ui-border)]/50 shadow-2xl lg:shadow-none z-50 flex flex-col animate-[slide-in-right_0.3s_ease-out] shrink-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--ui-border)]/50 shrink-0">
                    <h2 className="font-semibold text-[var(--ui-text)]">Group Info</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-[var(--ui-bg-hover)] text-[var(--ui-text-muted)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
                    {/* Summary */}
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-24 h-24 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center border-4 border-[var(--ui-border)]/50 shadow-md text-3xl font-bold text-[var(--ui-accent)]">
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">{group.name}</h3>
                            <p className="text-sm text-[var(--ui-text-muted)] mt-1">{group.description}</p>
                            <span className="inline-block mt-2 text-[10px] font-medium text-[var(--ui-text-muted)] bg-[var(--ui-bg-elevated)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {group.type} Group · {group.memberIds.length} Members
                            </span>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex justify-center gap-6 py-2 border-y border-[var(--ui-border)]/30">
                        <button 
                            onClick={onSearchClick}
                            className="flex flex-col items-center gap-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-[var(--ui-bg-base)] flex items-center justify-center group-hover:bg-[var(--ui-accent)]/10 transition-colors">
                                <Search className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-medium">Search</span>
                        </button>
                        <button 
                            onClick={onToggleMute}
                            className={`flex flex-col items-center gap-1 transition-colors group ${isMuted ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)]'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMuted ? 'bg-[var(--ui-accent)]/10' : 'bg-[var(--ui-bg-base)] group-hover:bg-[var(--ui-accent)]/10 transition-colors'}`}>
                                {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                            </div>
                            <span className="text-[11px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                        </button>
                    </div>

                    {/* Shared Media */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-[var(--ui-text)]">Media</h4>
                            <span className="text-xs text-[var(--ui-text-muted)] bg-[var(--ui-bg-base)] px-2 py-0.5 rounded-full">{mediaMessages.length}</span>
                        </div>
                        
                        {mediaMessages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1.5">
                                {mediaMessages.slice(-6).reverse().map((msg) => (
                                    <div key={msg.id} className="aspect-square bg-[var(--ui-bg-base)] rounded-md overflow-hidden group relative">
                                        <img 
                                            src={msg.imageUrl || msg.gifUrl} 
                                            alt="Shared media" 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-24 bg-[var(--ui-bg-base)] rounded-lg text-center px-4">
                                <ImageIcon className="w-6 h-6 text-[var(--ui-text-muted)] mb-1 opacity-50" />
                                <span className="text-xs text-[var(--ui-text-muted)]">No media shared yet</span>
                            </div>
                        )}
                        
                        {mediaMessages.length > 6 && (
                            <button className="w-full mt-2 py-2 text-sm text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/5 rounded-lg transition-colors flex items-center justify-between px-3">
                                <span>View all</span>
                                <span className="text-xs">&rarr;</span>
                            </button>
                        )}
                    </div>

                    {/* Members List */}
                    <div>
                        <div className="flex items-center justify-between mb-3 text-[var(--ui-text)]">
                            <h4 className="text-sm font-semibold">Members</h4>
                            <span className="text-xs text-[var(--ui-text-muted)] bg-[var(--ui-bg-base)] px-2 py-0.5 rounded-full">{group.memberIds.length}</span>
                        </div>
                        
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {loadingMembers ? (
                                <div className="text-center py-4 text-xs text-[var(--ui-text-muted)]">Loading members...</div>
                            ) : (
                                group.memberIds.slice(0, 50).map(uid => {
                                    const profile = memberProfiles[uid];
                                    const isAdmin = group.adminIds?.includes(uid);
                                    
                                    return (
                                        <div key={uid} className="flex items-center justify-between group/member rounded-lg p-1 -mx-1 hover:bg-[var(--ui-bg-base)] transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <img 
                                                    src={resolveProfileImage(profile?.profileImage, undefined, profile?.name || 'User')} 
                                                    alt={profile?.name || 'Member'}
                                                    className="w-10 h-10 rounded-full object-cover shrink-0 bg-[var(--ui-bg-elevated)]"
                                                />
                                                <div className="min-w-0 flex flex-col">
                                                    <span className="text-sm font-medium text-[var(--ui-text)] truncate flex items-center gap-1.5">
                                                        {uid === user?.uid ? 'You' : (profile?.name || 'Loading...')}
                                                        {isAdmin && <Shield className="w-3.5 h-3.5 text-[var(--ui-accent)] flex-shrink-0" />}
                                                    </span>
                                                    {profile?.field && (
                                                        <span className="text-[11px] text-[var(--ui-text-muted)] truncate">
                                                            {profile.field} {profile.year && `• ${profile.year}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Admin Actions Dropdown wrapper placeholder */}
                                            {isAdmin && uid !== user?.uid && group.adminIds?.includes(user?.uid || '') && (
                                                <button 
                                                    onClick={() => onRemoveMember?.(uid)}
                                                    className="p-1.5 opacity-0 group-hover/member:opacity-100 transition-opacity rounded-full hover:bg-[var(--ui-danger)]/10 text-[var(--ui-danger)]"
                                                    title="Remove Member"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            
                            {group.memberIds.length > 50 && (
                                <button className="w-full mt-2 py-2 text-xs text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/5 rounded-lg transition-colors">
                                    Load more members
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 border-t border-[var(--ui-border)]/30 space-y-1">
                        <button 
                            onClick={onLeaveGroup}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--ui-danger)] hover:bg-[var(--ui-danger)]/10 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium">Leave Group</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
