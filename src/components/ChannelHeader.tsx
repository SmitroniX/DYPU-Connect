'use client';

import { Hash, AtSign, Volume2 } from 'lucide-react';

interface ChannelHeaderProps {
    /** Channel name displayed after the # icon */
    name: string;
    /** Optional description shown to the right of the divider */
    description?: string;
    /** Icon type: hash for text channels, at for DMs, voice for voice */
    type?: 'text' | 'dm' | 'voice';
    /** Optional right-side content (member count, buttons, etc.) */
    children?: React.ReactNode;
}

export default function ChannelHeader({ name, description, type = 'text', children }: ChannelHeaderProps) {
    const Icon = type === 'dm' ? AtSign : type === 'voice' ? Volume2 : Hash;

    return (
        <div className="dc-channel-header">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className="h-5 w-5 text-[var(--dc-text-muted)] shrink-0" />
                <h1 className="text-base font-semibold text-[var(--dc-text-primary)] truncate">
                    {name}
                </h1>
                {description && (
                    <>
                        <div className="w-px h-5 bg-[var(--dc-divider)] mx-1 shrink-0" />
                        <p className="text-sm text-[var(--dc-text-muted)] truncate">
                            {description}
                        </p>
                    </>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {children}
                </div>
            )}
        </div>
    );
}

