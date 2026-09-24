'use client';

/**
 * Stylish branded loading animation for DYPU Connect.
 * Shows an animated logo mark with orbiting dots and shimmer text.
 *
 * Variants:
 *  - "full"    → centered on full screen (for page-level loading)
 *  - "inline"  → compact, for within a section/card
 *  - "minimal" → just the spinner, no text
 *  - "button"  → compact inline spinner for buttons
 */

export interface ButtonSpinnerProps {
    size?: 'xs' | 'sm' | 'md';
    tone?: 'accent' | 'white' | 'danger' | 'muted';
    className?: string;
}

const BUTTON_SPINNER_SIZES: Record<'xs' | 'sm' | 'md', string> = {
    xs: 'h-3.5 w-3.5 border-2',
    sm: 'h-4 w-4 border-2',
    md: 'h-5 w-5 border-2',
};

const BUTTON_SPINNER_TONES: Record<'accent' | 'white' | 'danger' | 'muted', string> = {
    white: 'border-white/30 border-t-white',
    accent: 'border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)]',
    danger: 'border-red-400/30 border-t-red-400',
    muted: 'border-[var(--ui-text-muted)]/30 border-t-[var(--ui-text-muted)]',
};

export function ButtonSpinner({
    size = 'sm',
    tone = 'white',
    className = '',
}: {
    size?: 'xs' | 'sm' | 'md';
    tone?: 'accent' | 'white' | 'danger' | 'muted';
    className?: string;
}) {
    const sizeCls = BUTTON_SPINNER_SIZES[size] || BUTTON_SPINNER_SIZES.sm;
    const toneCls = BUTTON_SPINNER_TONES[tone] || BUTTON_SPINNER_TONES.white;

    return (
        <span
            role="status"
            aria-label="Loading"
            className={`inline-block shrink-0 rounded-full animate-spin border-solid ${sizeCls} ${toneCls} ${className}`}
        />
    );
}

export interface LoadingSpinnerProps {
    /** Display variant */
    variant?: 'full' | 'inline' | 'minimal' | 'button';
    /** Optional loading message */
    message?: string;
    /** Size of the spinner */
    size?: 'xs' | 'sm' | 'md' | 'lg';
    /** Color tone of the spinner */
    tone?: 'accent' | 'white' | 'danger' | 'muted';
    /** Additional CSS classes */
    className?: string;
}

const MINIMAL_SIZES: Record<'xs' | 'sm' | 'md' | 'lg', { container: string; dot: string }> = {
    xs: { container: 'h-4 w-4', dot: 'h-1 w-1' },
    sm: { container: 'h-6 w-6', dot: 'h-1.5 w-1.5' },
    md: { container: 'h-8 w-8', dot: 'h-1.5 w-1.5' },
    lg: { container: 'h-12 w-12', dot: 'h-2 w-2' },
};

const MINIMAL_TONES: Record<'accent' | 'white' | 'danger' | 'muted', { outer: string; arc: string; dot: string }> = {
    accent: {
        outer: 'border-[var(--ui-accent)]/20',
        arc: 'border-t-[var(--ui-accent)]',
        dot: 'bg-[var(--ui-accent)]',
    },
    white: {
        outer: 'border-white/20',
        arc: 'border-t-white',
        dot: 'bg-white',
    },
    danger: {
        outer: 'border-red-400/20',
        arc: 'border-t-red-400',
        dot: 'bg-red-400',
    },
    muted: {
        outer: 'border-[var(--ui-text-muted)]/20',
        arc: 'border-t-[var(--ui-text-muted)]',
        dot: 'bg-[var(--ui-text-muted)]',
    },
};

const FULL_CONTAINER_SIZES: Record<'xs' | 'sm' | 'md' | 'lg', { orbit: string; svg: string; text: string; dot1: string; dot2: string }> = {
    xs: { orbit: 'h-8 w-8', svg: 'h-8 w-8', text: 'text-xs', dot1: 'h-1 w-1', dot2: 'h-1 w-1' },
    sm: { orbit: 'h-12 w-12', svg: 'h-12 w-12', text: 'text-sm', dot1: 'h-1.5 w-1.5', dot2: 'h-1 w-1' },
    md: { orbit: 'h-14 w-14', svg: 'h-14 w-14', text: 'text-lg', dot1: 'h-2 w-2', dot2: 'h-1.5 w-1.5' },
    lg: { orbit: 'h-16 w-16', svg: 'h-16 w-16', text: 'text-xl', dot1: 'h-2 w-2', dot2: 'h-1.5 w-1.5' },
};

export default function LoadingSpinner({
    variant = 'full',
    message,
    size,
    tone = 'accent',
    className = '',
}: LoadingSpinnerProps) {
    if (variant === 'button') {
        const buttonSize = size === 'lg' ? 'md' : size;
        return <ButtonSpinner size={buttonSize} tone={tone} className={className} />;
    }

    if (variant === 'minimal') {
        const effectiveSize = size || 'md';
        const sizeConfig = MINIMAL_SIZES[effectiveSize] || MINIMAL_SIZES.md;
        const toneConfig = MINIMAL_TONES[tone] || MINIMAL_TONES.accent;

        return (
            <div className={`flex items-center justify-center ${className}`}>
                <div className={`relative ${sizeConfig.container}`}>
                    {/* Outer ring */}
                    <div className={`absolute inset-0 rounded-full border-2 ${toneConfig.outer}`} />
                    {/* Spinning arc */}
                    <div className={`absolute inset-0 rounded-full border-2 border-transparent ${toneConfig.arc} animate-spin`} />
                    {/* Center dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`${sizeConfig.dot} rounded-full ${toneConfig.dot} animate-pulse`} />
                    </div>
                </div>
            </div>
        );
    }

    const isInline = variant === 'inline';
    const effectiveSize = size || (isInline ? 'md' : 'lg');
    const sizeConfig = FULL_CONTAINER_SIZES[effectiveSize] || FULL_CONTAINER_SIZES.lg;

    return (
        <div className={`flex flex-col items-center justify-center gap-5 ${isInline ? 'py-12' : 'min-h-[60vh]'} ${className}`}>
            {/* Animated logo container */}
            <div className="relative">
                {/* Glow backdrop */}
                <div className="absolute inset-0 rounded-full bg-[var(--ui-accent)]/10 blur-xl animate-[pulse-glow_2s_ease-in-out_infinite] scale-150" />

                {/* Outer orbit ring */}
                <div className={`relative ${sizeConfig.orbit}`}>
                    {/* Track */}
                    <div className="absolute inset-0 rounded-full border border-[var(--ui-accent)]/10" />

                    {/* Spinning gradient ring */}
                    <svg className={`absolute inset-0 ${sizeConfig.svg} animate-spin`} style={{ animationDuration: '1.5s' }} viewBox="0 0 64 64">
                        <circle
                            cx="32" cy="32" r="30"
                            fill="none"
                            stroke={`url(#loader-gradient-${tone})`}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="140 60"
                        />
                        <defs>
                            <linearGradient id={`loader-gradient-${tone}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={tone === 'white' ? '#ffffff' : tone === 'danger' ? '#ef4444' : tone === 'muted' ? 'var(--ui-text-muted)' : 'var(--ui-accent)'} stopOpacity="1" />
                                <stop offset="50%" stopColor={tone === 'white' ? '#ffffff' : tone === 'danger' ? '#ef4444' : tone === 'muted' ? 'var(--ui-text-muted)' : 'var(--ui-accent)'} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={tone === 'white' ? '#ffffff' : tone === 'danger' ? '#ef4444' : tone === 'muted' ? 'var(--ui-text-muted)' : 'var(--ui-accent)'} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center logo mark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`${sizeConfig.text} font-bold text-[var(--ui-accent)] animate-[pulse-glow_2s_ease-in-out_infinite]`}>
                            ✦
                        </span>
                    </div>

                    {/* Orbiting dots */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className={`${sizeConfig.dot1} rounded-full bg-[var(--ui-accent)] shadow-[0_0_8px_var(--ui-accent)]`} />
                        </div>
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s', animationDirection: 'reverse' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                            <div className={`${sizeConfig.dot2} rounded-full bg-[var(--ui-accent)]/60`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-2">
                {/* Animated dots */}
                <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-[typing-dot_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-[typing-dot_1.4s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-[typing-dot_1.4s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
                </div>

                {/* Message */}
                <p className="text-sm text-[var(--ui-text-muted)] animate-pulse">
                    {message || 'Loading…'}
                </p>
            </div>
        </div>
    );
}
