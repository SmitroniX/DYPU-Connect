'use client';

import { Flag, Inbox, ShieldAlert } from 'lucide-react';

export default function AdminReportsPage() {
    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="mb-6 glass border-red-500/20 bg-red-500/5 p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/20 shrink-0">
                    <ShieldAlert className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Moderation Reports</h1>
                    <p className="text-sm text-red-300/70 mt-1">
                        Review and act on user-submitted reports and content flags.
                    </p>
                </div>
            </div>

            {/* Empty State */}
            <div className="glass overflow-hidden">
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-3xl bg-red-500/10 blur-2xl" />
                        <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                            <Inbox className="h-10 w-10 text-slate-500" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Reports Yet</h2>
                    <p className="text-sm text-slate-400 max-w-md mb-6">
                        The moderation reports system is not yet configured. When users report content or other users,
                        those reports will appear here for you to review and take action.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
                        <div className="glass p-4 text-center">
                            <Flag className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                            <p className="text-xs font-medium text-white">Content Flags</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Flagged messages & confessions</p>
                        </div>
                        <div className="glass p-4 text-center">
                            <ShieldAlert className="h-5 w-5 text-red-400 mx-auto mb-2" />
                            <p className="text-xs font-medium text-white">User Reports</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Reported user accounts</p>
                        </div>
                        <div className="glass p-4 text-center">
                            <Inbox className="h-5 w-5 text-violet-400 mx-auto mb-2" />
                            <p className="text-xs font-medium text-white">Review Queue</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Pending moderation items</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

