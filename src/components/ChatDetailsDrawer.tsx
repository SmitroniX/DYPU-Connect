'use client';

import { X, Search, Image as ImageIcon, Bell, BellOff, Ban, Trash2, MoreVertical } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    senderId: string;
    gifUrl?: string;
    imageUrl?: string;
    audioUrl?: string;
    timestamp?: Timestamp | null;
}

interface ChatDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    otherName: string;
    otherImage: string;
    messages: Message[];
    onSearchClick?: () => void;
    isMuted?: boolean;
    onToggleMute?: () => void;
}

export default function ChatDetailsDrawer({
    isOpen,
    onClose,
    otherName,
    otherImage,
    messages,
    onSearchClick,
    isMuted = false,
    onToggleMute
}: ChatDetailsDrawerProps) {
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
                <div className="flex items-center justify-between p-4 border-b border-[var(--ui-border)]/50">
                    <h2 className="font-semibold text-[var(--ui-text)]">Contact Info</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-[var(--ui-bg-hover)] text-[var(--ui-text-muted)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
                    {/* Profile Summary */}
                    <div className="flex flex-col items-center text-center space-y-3">
                        <img 
                            src={otherImage} 
                            alt={otherName} 
                            className="w-24 h-24 rounded-full object-cover ring-4 ring-[var(--ui-border)]/50 shadow-md"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-[var(--ui-text)]">{otherName}</h3>
                            <p className="text-sm text-[var(--ui-text-muted)]">DYPU Connect User</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex justify-center gap-6 py-2 border-y border-[var(--ui-border)]/30">
                        <button 
                            onClick={onSearchClick}
                            className="flex flex-col items-center gap-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-[var(--ui-bg-base)] flex items-center justify-center group-hover:bg-[var(--ui-accent)]/10">
                                <Search className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-medium">Search</span>
                        </button>
                        <button 
                            onClick={onToggleMute}
                            className={`flex flex-col items-center gap-1 transition-colors group ${isMuted ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)]'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMuted ? 'bg-[var(--ui-accent)]/10' : 'bg-[var(--ui-bg-base)] group-hover:bg-[var(--ui-accent)]/10'}`}>
                                {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                            </div>
                            <span className="text-[11px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-[var(--ui-bg-base)] flex items-center justify-center group-hover:bg-[var(--ui-accent)]/10">
                                <MoreVertical className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-medium">More</span>
                        </button>
                    </div>

                    {/* Shared Media */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-[var(--ui-text)]">Media, links, and docs</h4>
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

                    {/* Danger Zone */}
                    <div className="pt-4 border-t border-[var(--ui-border)]/30 space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--ui-danger)] hover:bg-[var(--ui-danger)]/10 rounded-lg transition-colors">
                            <Ban className="w-5 h-5" />
                            <span className="text-sm font-medium">Block User</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--ui-danger)] hover:bg-[var(--ui-danger)]/10 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Clear Chat</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
