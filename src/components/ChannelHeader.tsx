'use client';

import PageHeader from '@/components/PageHeader';

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

/**
 * @deprecated Use PageHeader directly instead.
 * This wrapper exists for backward compatibility during migration.
 */
export default function ChannelHeader({ name, description, children }: ChannelHeaderProps) {
    return (
        <PageHeader title={name} description={description}>
            {children}
        </PageHeader>
    );
}
