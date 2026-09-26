import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from './ChatHeader';
import * as androidBridge from '@/lib/android';

vi.mock('@/hooks/usePresence', () => ({
    useUserPresence: () => ({ state: 'online' }),
}));

vi.mock('@/lib/android', () => ({
    requestAndroidCallPermissions: vi.fn(),
}));

describe('ChatHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requests Android call permissions and initiates voice call', () => {
        const onAudioCall = vi.fn();
        render(
            <ChatHeader
                chatId="chat-1"
                otherUserId="user-2"
                otherName="John Doe"
                otherImage="/avatar.png"
                onAudioCall={onAudioCall}
            />
        );

        const voiceBtn = screen.getByRole('button', { name: /start voice call/i });
        fireEvent.click(voiceBtn);

        expect(androidBridge.requestAndroidCallPermissions).toHaveBeenCalledTimes(1);
        expect(onAudioCall).toHaveBeenCalledTimes(1);
    });

    it('requests Android call permissions and initiates video call', () => {
        const onVideoCall = vi.fn();
        render(
            <ChatHeader
                chatId="chat-1"
                otherUserId="user-2"
                otherName="John Doe"
                otherImage="/avatar.png"
                onVideoCall={onVideoCall}
            />
        );

        const videoBtn = screen.getByRole('button', { name: /start video call/i });
        fireEvent.click(videoBtn);

        expect(androidBridge.requestAndroidCallPermissions).toHaveBeenCalledTimes(1);
        expect(onVideoCall).toHaveBeenCalledTimes(1);
    });
});
