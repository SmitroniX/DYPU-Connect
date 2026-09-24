import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton, {
    ConfessionCardSkeleton,
    ChatMessageSkeleton,
    ChatMessageListSkeleton,
    GroupCardSkeleton,
    GroupGridSkeleton,
    ProfileSkeleton,
    TableSkeleton,
    SettingsSkeleton,
} from './Skeleton';

describe('Skeleton', () => {
    it('renders block variant by default with shimmer', () => {
        const { container } = render(<Skeleton className="custom-class" />);
        const el = container.firstElementChild;
        expect(el).toHaveClass('h-24');
        expect(el).toHaveClass('custom-class');
        expect(el).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders text and circle variants', () => {
        const { container: textContainer } = render(<Skeleton variant="text" />);
        expect(textContainer.firstElementChild).toHaveClass('h-4');

        const { container: circleContainer } = render(<Skeleton variant="circle" />);
        expect(circleContainer.firstElementChild).toHaveClass('rounded-full');
    });
});

describe('Domain Skeleton Presets', () => {
    it('renders ConfessionCardSkeleton with header, body, and footer', () => {
        const { container } = render(<ConfessionCardSkeleton />);
        expect(container.querySelector('.bg-\\[var\\(--ui-bg-surface\\)\\]')).toBeInTheDocument();
        expect(container.querySelector('.bg-\\[var\\(--ui-divider\\)\\]')).toBeInTheDocument();
    });

    it('renders ChatMessageSkeleton for incoming and outgoing messages', () => {
        const { container: incoming } = render(<ChatMessageSkeleton isMine={false} hasHeader={true} />);
        expect(incoming.querySelector('.justify-start')).toBeInTheDocument();

        const { container: outgoing } = render(<ChatMessageSkeleton isMine={true} hasHeader={false} />);
        expect(outgoing.querySelector('.justify-end')).toBeInTheDocument();
        expect(outgoing.querySelector('.flex-row-reverse')).toBeInTheDocument();
    });

    it('renders ChatMessageListSkeleton with correct count', () => {
        const { container } = render(<ChatMessageListSkeleton count={4} />);
        const messages = container.querySelectorAll('.animate-pulse, .flex.w-full');
        expect(messages.length).toBeGreaterThanOrEqual(4);
    });

    it('renders GroupCardSkeleton and GroupGridSkeleton', () => {
        const { container: single } = render(<GroupCardSkeleton />);
        expect(single.firstElementChild).toHaveClass('rounded-xl');

        const { container: grid } = render(<GroupGridSkeleton count={3} />);
        expect(grid.querySelectorAll('.rounded-xl').length).toBeGreaterThanOrEqual(3);
    });

    it('renders ProfileSkeleton with header, avatar, and 2-column grid', () => {
        const { container } = render(<ProfileSkeleton />);
        expect(container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2')).toBeInTheDocument();
        expect(container.querySelectorAll('.rounded-3xl').length).toBeGreaterThanOrEqual(2);
    });

    it('renders TableSkeleton with specified rows and cols', () => {
        const { container } = render(<TableSkeleton rows={3} cols={5} />);
        const ths = container.querySelectorAll('th');
        expect(ths).toHaveLength(5);
        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
    });

    it('renders SettingsSkeleton', () => {
        const { container } = render(<SettingsSkeleton />);
        expect(container.querySelectorAll('.rounded-2xl').length).toBe(2);
    });
});
