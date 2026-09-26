import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfessionCard from './ConfessionCard';
import type { Confession } from '@/lib/confessions';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

vi.mock('@/components/AuthProvider', () => ({
    useAuth: () => ({
        user: { uid: 'user-123' },
    }),
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    updateDoc: vi.fn(),
    increment: vi.fn(),
    serverTimestamp: vi.fn(),
    collection: vi.fn(),
    addDoc: vi.fn(),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockConfession: Confession = {
    id: 'confession-456',
    text: 'This is an anonymous confession!',
    anonymousName: 'Anonymous Student',
    createdAt: { toDate: () => new Date('2026-09-26T00:00:00Z') } as any,
    likesCount: 5,
    commentsCount: 3,
};

describe('ConfessionCard Comments System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders comments button with count and comments icon', () => {
        render(<ConfessionCard confession={mockConfession} linkToDetail={true} />);

        const commentsBtn = screen.getByRole('button', { name: /comments/i });
        expect(commentsBtn).toBeInTheDocument();
        expect(commentsBtn).toHaveTextContent('3');
    });

    it('navigates to /confessions/[id]#comments when linkToDetail is true', () => {
        render(<ConfessionCard confession={mockConfession} linkToDetail={true} />);

        const commentsBtn = screen.getByRole('button', { name: /comments/i });
        fireEvent.click(commentsBtn);

        expect(mockPush).toHaveBeenCalledWith('/confessions/confession-456#comments');
    });

    it('calls custom onCommentClick if provided', () => {
        const onCommentClick = vi.fn();
        render(
            <ConfessionCard
                confession={mockConfession}
                linkToDetail={true}
                onCommentClick={onCommentClick}
            />
        );

        const commentsBtn = screen.getByRole('button', { name: /comments/i });
        fireEvent.click(commentsBtn);

        expect(onCommentClick).toHaveBeenCalledTimes(1);
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('scrolls and focuses comment-input if linkToDetail is false and input exists', () => {
        // Create comment-input element in document
        const inputEl = document.createElement('input');
        inputEl.id = 'comment-input';
        const focusSpy = vi.spyOn(inputEl, 'focus');
        const scrollSpy = vi.spyOn(inputEl, 'scrollIntoView').mockImplementation(() => {});
        document.body.appendChild(inputEl);

        render(<ConfessionCard confession={mockConfession} linkToDetail={false} />);

        const commentsBtn = screen.getByRole('button', { name: /comments/i });
        fireEvent.click(commentsBtn);

        expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
        expect(focusSpy).toHaveBeenCalledTimes(1);

        document.body.removeChild(inputEl);
    });
});
