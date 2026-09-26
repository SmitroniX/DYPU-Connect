import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from './ChatInput';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => {
    const fn = vi.fn();
    return {
        default: Object.assign(fn, {
            error: vi.fn(),
            success: vi.fn(),
            loading: vi.fn(),
        }),
    };
});

vi.mock('@/lib/storage', () => ({
    uploadChatMedia: vi.fn(),
}));

vi.mock('@/lib/media', () => ({
    compressImage: vi.fn(),
    generateBlurHash: vi.fn(),
}));

describe('ChatInput', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders textarea and sends regular message on Enter', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'Hello campus!' } });

        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
        expect(onSend).toHaveBeenCalledWith({
            text: 'Hello campus!',
            gifUrl: undefined,
            imageUrl: undefined,
            blurHash: undefined,
            audioUrl: undefined,
        });
    });

    it('does not send message on Shift+Enter', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'Line one' } });

        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
        expect(onSend).not.toHaveBeenCalled();
    });

    it('shows autocomplete popup when user types / at the beginning', () => {
        render(<ChatInput onSend={vi.fn()} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/' } });

        expect(screen.getByText('Commands')).toBeInTheDocument();
        expect(screen.getByText('/shrug')).toBeInTheDocument();
        expect(screen.getByText('/tableflip')).toBeInTheDocument();
        expect(screen.getByText('/unflip')).toBeInTheDocument();
        expect(screen.getByText('/clear')).toBeInTheDocument();
        expect(screen.getByText('/help')).toBeInTheDocument();
    });

    it('filters commands as user types command prefix', () => {
        render(<ChatInput onSend={vi.fn()} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/t' } });

        expect(screen.getByText('/tableflip')).toBeInTheDocument();
        expect(screen.queryByText('/shrug')).not.toBeInTheDocument();
    });

    it('replaces text with shrug emoji when /shrug command is executed', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/shrug' } });
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        expect(onSend).not.toHaveBeenCalled();
        expect(textarea.value).toBe('¯\\_(ツ)_/¯');
    });

    it('replaces text with tableflip emoji when /tableflip command is executed', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/tableflip' } });
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        expect(onSend).not.toHaveBeenCalled();
        expect(textarea.value).toBe('(╯°□°)╯︵ ┻━┻');
    });

    it('replaces text with unflip emoji when /unflip command is executed', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/unflip' } });
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        expect(onSend).not.toHaveBeenCalled();
        expect(textarea.value).toBe('┬─┬ノ( º _ ºノ)');
    });

    it('clears draft when /clear command is executed', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/clear' } });
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        expect(onSend).not.toHaveBeenCalled();
        expect(textarea.value).toBe('');
    });

    it('shows help toast when /help command is executed', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/help' } });
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        expect(onSend).not.toHaveBeenCalled();
        expect(toast).toHaveBeenCalled();
        expect(textarea.value).toBe('');
    });

    it('allows clicking an autocomplete item to execute it', () => {
        render(<ChatInput onSend={vi.fn()} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/' } });

        const shrugBtn = screen.getByText('/shrug');
        fireEvent.click(shrugBtn);

        expect(textarea.value).toBe('¯\\_(ツ)_/¯');
    });

    it('supports formatting shortcuts: Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+Shift+X', () => {
        render(<ChatInput onSend={vi.fn()} placeholder="Type something..." />);

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'cool' } });
        textarea.selectionStart = 0;
        textarea.selectionEnd = 4;

        // Bold
        fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
        expect(textarea.value).toBe('**cool**');

        // Italic
        textarea.selectionStart = 0;
        textarea.selectionEnd = textarea.value.length;
        fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });
        expect(textarea.value).toBe('***cool***');

        // Inline code
        textarea.selectionStart = 0;
        textarea.selectionEnd = textarea.value.length;
        fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
        expect(textarea.value).toBe('`***cool***`');

        // Strikethrough
        textarea.selectionStart = 0;
        textarea.selectionEnd = textarea.value.length;
        fireEvent.keyDown(textarea, { key: 'X', ctrlKey: true, shiftKey: true });
        expect(textarea.value).toBe('~~`***cool***`~~');
    });

    it('handles Escape key to dismiss autocomplete or cancel reply', () => {
        const onCancelReply = vi.fn();
        const { rerender } = render(
            <ChatInput onSend={vi.fn()} placeholder="Type something..." />
        );

        const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '/' } });
        expect(screen.getByText('Commands')).toBeInTheDocument();

        // Dismiss command popup with Escape
        fireEvent.keyDown(textarea, { key: 'Escape' });
        expect(screen.queryByText('Commands')).not.toBeInTheDocument();

        // Cancel reply with Escape
        rerender(
            <ChatInput
                onSend={vi.fn()}
                placeholder="Type something..."
                replyToMessage={{ id: '1', senderName: 'Alice', text: 'Hey' } as any}
                onCancelReply={onCancelReply}
            />
        );
        fireEvent.keyDown(textarea, { key: 'Escape' });
        expect(onCancelReply).toHaveBeenCalledTimes(1);
    });
});
