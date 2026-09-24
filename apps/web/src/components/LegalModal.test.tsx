import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LegalModal from './LegalModal';

describe('LegalModal', () => {
    it('does not render when type is null', () => {
        const { container } = render(
            <LegalModal type={null} onClose={vi.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders Terms & Conditions when type is terms', () => {
        render(
            <LegalModal type="terms" onClose={vi.fn()} onAccept={vi.fn()} />
        );
        expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
        expect(screen.getByText(/Campus Community & Acceptance/i)).toBeInTheDocument();
        expect(screen.getAllByText(/DY Patil University/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Accept & Continue')).toBeInTheDocument();
    });

    it('renders Privacy Policy when type is privacy', () => {
        render(
            <LegalModal type="privacy" onClose={vi.fn()} onAccept={vi.fn()} />
        );
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
        expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();
        expect(screen.getByText(/Google Drive and Firebase/i)).toBeInTheDocument();
        expect(screen.getByText('Accept & Continue')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        render(
            <LegalModal type="terms" onClose={handleClose} />
        );
        const closeBtn = screen.getByRole('button', { name: /close modal/i });
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onAccept and onClose when Accept button is clicked', () => {
        const handleClose = vi.fn();
        const handleAccept = vi.fn();
        render(
            <LegalModal type="terms" onClose={handleClose} onAccept={handleAccept} />
        );
        const acceptBtn = screen.getByText('Accept & Continue');
        fireEvent.click(acceptBtn);
        expect(handleAccept).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
