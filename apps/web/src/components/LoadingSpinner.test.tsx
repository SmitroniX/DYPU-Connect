import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders full variant by default with message', () => {
        render(<LoadingSpinner message="Checking connection..." />);
        expect(screen.getByText('Checking connection...')).toBeInTheDocument();
        expect(screen.getByText('✦')).toBeInTheDocument();
    });

    it('renders inline variant with default message', () => {
        render(<LoadingSpinner variant="inline" />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders minimal variant without text message', () => {
        const { container } = render(<LoadingSpinner variant="minimal" size="sm" tone="danger" />);
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        expect(container.querySelector('.border-t-red-400')).toBeInTheDocument();
    });

    it('renders minimal variant with muted tone', () => {
        const { container } = render(<LoadingSpinner variant="minimal" tone="muted" />);
        expect(container.querySelector('.border-t-\\[var\\(--ui-text-muted\\)\\]')).toBeInTheDocument();
    });

    it('delegates button variant to ButtonSpinner', () => {
        render(<LoadingSpinner variant="button" size="sm" tone="white" />);
        const spinner = screen.getByRole('status', { name: /loading/i });
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('animate-spin');
        expect(spinner).toHaveClass('border-t-white');
    });
});

describe('ButtonSpinner', () => {
    it('renders with default sm size and white tone', () => {
        render(<ButtonSpinner />);
        const spinner = screen.getByRole('status', { name: /loading/i });
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('h-4');
        expect(spinner).toHaveClass('w-4');
        expect(spinner).toHaveClass('border-t-white');
    });

    it('renders with accent tone and custom className', () => {
        render(<ButtonSpinner tone="accent" size="md" className="ml-2" />);
        const spinner = screen.getByRole('status', { name: /loading/i });
        expect(spinner).toHaveClass('border-t-[var(--ui-accent)]');
        expect(spinner).toHaveClass('h-5');
        expect(spinner).toHaveClass('ml-2');
    });

    it('renders with danger tone and xs size', () => {
        render(<ButtonSpinner tone="danger" size="xs" />);
        const spinner = screen.getByRole('status', { name: /loading/i });
        expect(spinner).toHaveClass('border-t-red-400');
        expect(spinner).toHaveClass('h-3.5');
    });

    it('renders with muted tone', () => {
        render(<ButtonSpinner tone="muted" />);
        const spinner = screen.getByRole('status', { name: /loading/i });
        expect(spinner).toHaveClass('border-t-[var(--ui-text-muted)]');
    });
});
