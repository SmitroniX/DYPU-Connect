import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalSearch from './GlobalSearch';

const mockPush = vi.fn();
const mockSetSearchModalOpen = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

vi.mock('@/store/useStore', () => ({
    useStore: () => ({
        searchModalOpen: true,
        setSearchModalOpen: mockSetSearchModalOpen,
        currentUser: { uid: 'test-user-id' },
    }),
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

describe('GlobalSearch Command Palette', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Quick Commands & Navigation when search query is empty', () => {
        render(<GlobalSearch />);

        expect(screen.getByText('Quick Commands & Navigation')).toBeInTheDocument();
        expect(screen.getByText('Confessions')).toBeInTheDocument();
        expect(screen.getByText('Campus Chat')).toBeInTheDocument();
        expect(screen.getByText('Anonymous Chat')).toBeInTheDocument();
        expect(screen.getByText('Student Groups')).toBeInTheDocument();
        expect(screen.getByText('My Profile')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('filters quick commands when query matches keywords or title', () => {
        render(<GlobalSearch />);

        const input = screen.getByPlaceholderText(/Search or jump to.../i);
        fireEvent.change(input, { target: { value: 'settings' } });

        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.queryByText('Confessions')).not.toBeInTheDocument();
    });

    it('navigates when clicking a command', () => {
        render(<GlobalSearch />);

        const confessionsCmd = screen.getByText('Confessions');
        fireEvent.click(confessionsCmd);

        expect(mockPush).toHaveBeenCalledWith('/confessions');
        expect(mockSetSearchModalOpen).toHaveBeenCalledWith(false);
    });

    it('navigates with Enter key on selected command', () => {
        render(<GlobalSearch />);

        const input = screen.getByPlaceholderText(/Search or jump to.../i);
        // Default selectedIndex is 0 (Confessions)
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockPush).toHaveBeenCalledWith('/confessions');
        expect(mockSetSearchModalOpen).toHaveBeenCalledWith(false);
    });

    it('supports ArrowDown and ArrowUp keyboard navigation', () => {
        render(<GlobalSearch />);

        const input = screen.getByPlaceholderText(/Search or jump to.../i);
        
        // ArrowDown moves from index 0 (Confessions) to index 1 (Campus Chat)
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockPush).toHaveBeenCalledWith('/public-chat');
        expect(mockSetSearchModalOpen).toHaveBeenCalledWith(false);

        // ArrowUp moves back
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(mockPush).toHaveBeenCalledWith('/confessions');
    });
});
