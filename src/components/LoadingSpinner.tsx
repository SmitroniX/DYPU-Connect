'use client';

/**
 * Stylish branded loading animation for DYPU Connect.
 * Shows an animated logo mark with orbiting dots and shimmer text.
 *
 * Variants:
 *  - "full"    → centered on full screen (for page-level loading)
 *  - "inline"  → compact, for within a section/card
 *  - "minimal" → just the spinner, no text
 */

interface LoadingSpinnerProps {
    /** Display variant */
    variant?: 'full' | 'inline' | 'minimal';
    /** Optional loading message */
    message?: string;
}

export default function LoadingSpinner({ variant = 'full', message }: LoadingSpinnerProps) {
    if (variant === 'minimal') {
        return (
            <div className="flex items-center justify-center">
                <div className="relative h-8 w-8">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-[var(--ui-accent)]/20" />
                    {/* Spinning arc */}
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--ui-accent)] animate-spin" />
                    {/* Center dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const isInline = variant === 'inline';

    return (
        <div className={`flex flex-col items-center justify-center gap-5 ${isInline ? 'py-12' : 'min-h-[60vh]'}`}>
            {/* Animated logo container */}
            <div className="relative">
                {/* Glow backdrop */}
                <div className="absolute inset-0 rounded-full bg-[var(--ui-accent)]/10 blur-xl animate-[pulse-glow_2s_ease-in-out_infinite] scale-150" />

                {/* Outer orbit ring */}
                <div className="relative h-16 w-16">
                    {/* Track */}
                    <div className="absolute inset-0 rounded-full border border-[var(--ui-accent)]/10" />

                    {/* Spinning gradient ring */}
                    <svg className="absolute inset-0 h-16 w-16 animate-spin" style={{ animationDuration: '1.5s' }} viewBox="0 0 64 64">
                        <circle
                            cx="32" cy="32" r="30"
                            fill="none"
                            stroke="url(#loader-gradient)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="140 60"
                        />
                        <defs>
                            <linearGradient id="loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--ui-accent)" stopOpacity="1" />
                                <stop offset="50%" stopColor="var(--ui-accent)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="var(--ui-accent)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center logo mark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-[var(--ui-accent)] animate-[pulse-glow_2s_ease-in-out_infinite]">
                            ✦
                        </span>
                    </div>

                    {/* Orbiting dots */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="h-2 w-2 rounded-full bg-[var(--ui-accent)] shadow-[0_0_8px_var(--ui-accent)]" />
                        </div>
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s', animationDirection: 'reverse' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                            <div className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]/60" />
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

