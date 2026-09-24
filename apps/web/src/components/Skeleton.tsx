'use client';

import { useReducedMotion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circle' | 'block';
}

/**
 * A reusable Skeleton loading component with a shimmer effect.
 * Respects prefers-reduced-motion via Framer Motion and CSS.
 * 
 * @param className - Additional Tailwind classes for sizing and positioning
 * @param variant - Predefined shape variants: 'text', 'circle', or 'block'
 */
export function Skeleton({ className, variant = 'block' }: SkeletonProps) {
    const shouldReduceMotion = useReducedMotion();
    const baseStyles = "relative overflow-hidden bg-[var(--ui-bg-elevated)]/50";
    
    const variantStyles = {
        text: "h-4 w-full rounded",
        circle: "h-12 w-12 rounded-full",
        block: "h-24 w-full rounded-xl",
    };

    return (
        <div 
            className={cn(
                baseStyles, 
                variantStyles[variant], 
                className
            )}
            aria-hidden="true"
        >
            {!shouldReduceMotion && (
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--ui-text)]/5 to-transparent animate-skeleton-shimmer motion-reduce:hidden"
                />
            )}
        </div>
    );
}

/**
 * Skeleton for Confession cards.
 * Features header (mood pill + time), body (2-3 text shimmer bars), author row, and reaction pills footer.
 */
export function ConfessionCardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-2xl sm:rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] p-5 sm:p-7 shadow-lg flex flex-col justify-between backdrop-blur-md",
                className
            )}
            aria-hidden="true"
        >
            {/* Header: mood pill + time */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton variant="circle" className="h-4 w-4" />
                </div>
            </div>

            {/* Quote decoration placeholder */}
            <Skeleton className="h-7 w-7 rounded-lg mb-3 opacity-30" />

            {/* Body: 2-3 text shimmer bars */}
            <div className="space-y-2.5 flex-1 mb-6">
                <Skeleton variant="text" className="w-full h-4" />
                <Skeleton variant="text" className="w-11/12 h-4" />
                <Skeleton variant="text" className="w-3/4 h-4" />
            </div>

            {/* Author info */}
            <div className="mt-6 flex items-center gap-3">
                <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
                <div className="flex flex-col gap-1">
                    <Skeleton variant="text" className="h-3.5 w-24" />
                    <Skeleton variant="text" className="h-2.5 w-16" />
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--ui-divider)] my-5" />

            {/* Footer: reaction pills */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-14 rounded-full" />
                    <Skeleton className="h-7 w-14 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-8 rounded-full" />
                    <Skeleton className="h-7 w-8 rounded-full" />
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for a single chat message bubble.
 * Features realistic bubble shape, avatar, and optional username header.
 */
export function ChatMessageSkeleton({
    isMine = false,
    hasHeader = true,
    className = '',
}: {
    isMine?: boolean;
    hasHeader?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex w-full",
                isMine ? "justify-end" : "justify-start",
                hasHeader ? "mt-6" : "mt-1",
                className
            )}
            aria-hidden="true"
        >
            <div
                className={cn(
                    "flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[70%]",
                    isMine ? "flex-row-reverse" : "flex-row"
                )}
            >
                {/* Avatar Column */}
                <div className="w-6 sm:w-8 shrink-0 flex flex-col items-center justify-end pb-1">
                    {hasHeader ? (
                        <Skeleton variant="circle" className="w-6 h-6 sm:w-8 sm:h-8" />
                    ) : (
                        <div className="w-6 sm:w-8" />
                    )}
                </div>

                {/* Message Bubble Container */}
                <div className={cn("relative flex flex-col", isMine ? "items-end" : "items-start")}>
                    {/* Username header */}
                    {hasHeader && !isMine && (
                        <div className="mb-1 ml-1 pl-1">
                            <Skeleton variant="text" className="h-3 w-20 rounded" />
                        </div>
                    )}

                    {/* Actual Bubble */}
                    <div
                        className={cn(
                            "relative px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col min-w-[120px] max-w-md border shadow-sm",
                            isMine
                                ? "rounded-[22px] rounded-br-[6px] bg-[var(--ui-accent-dim)]/50 border-[var(--ui-border)]"
                                : "rounded-[22px] rounded-bl-[6px] bg-[var(--ui-bg-surface)] border-[var(--ui-border)]"
                        )}
                    >
                        <div className="space-y-1.5">
                            <Skeleton
                                variant="text"
                                className={cn("h-3.5", isMine ? "w-36" : "w-48")}
                            />
                            <Skeleton
                                variant="text"
                                className={cn("h-3.5", isMine ? "w-24" : "w-32")}
                            />
                        </div>
                        <Skeleton
                            variant="text"
                            className="h-2 w-8 mt-2 self-end rounded opacity-60"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for a list of staggered message bubbles alternating between incoming and outgoing.
 */
export function ChatMessageListSkeleton({
    count = 5,
    className = '',
}: {
    count?: number;
    className?: string;
}) {
    const pattern = [
        { isMine: false, hasHeader: true },
        { isMine: false, hasHeader: false },
        { isMine: true, hasHeader: true },
        { isMine: false, hasHeader: true },
        { isMine: true, hasHeader: false },
        { isMine: true, hasHeader: false },
        { isMine: false, hasHeader: true },
    ];

    return (
        <div className={cn("flex flex-col space-y-2 p-4", className)} aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => {
                const config = pattern[i % pattern.length];
                return (
                    <ChatMessageSkeleton
                        key={i}
                        isMine={config.isMine}
                        hasHeader={config.hasHeader}
                    />
                );
            })}
        </div>
    );
}

/**
 * Skeleton for an individual group card matching app/groups/page.tsx.
 */
export function GroupCardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] backdrop-blur-sm",
                className
            )}
            aria-hidden="true"
        >
            {/* Icon box */}
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                    <Skeleton variant="text" className="h-4 w-36" />
                </div>
                <Skeleton variant="text" className="h-3 w-56 ml-5.5" />
            </div>

            {/* Badges / chevron */}
            <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-4 rounded" />
            </div>
        </div>
    );
}

/**
 * Skeleton grid/list for groups matching app/groups/page.tsx.
 */
export function GroupGridSkeleton({
    count = 3,
    className = '',
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className={cn("space-y-2 w-full", className)} aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <GroupCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Skeleton for user profile page matching app/profile/page.tsx.
 * Features banner, avatar circle, badge, bio lines, and 2-column details grid.
 */
export function ProfileSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={cn("max-w-3xl mx-auto py-8 px-4 space-y-8", className)} aria-hidden="true">
            {/* Header Card */}
            <div className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] shadow-xl">
                {/* Banner */}
                <div className="h-32 bg-[var(--ui-bg-elevated)]/60 relative overflow-hidden">
                    <Skeleton className="h-full w-full rounded-none" />
                </div>

                <div className="px-6 pb-6 sm:px-10 relative">
                    {/* Avatar row */}
                    <div className="flex justify-between items-end -mt-16 mb-4">
                        <div className="relative h-32 w-32 rounded-full p-1.5 bg-[var(--ui-bg-surface)]">
                            <Skeleton variant="circle" className="h-full w-full" />
                        </div>
                        <Skeleton className="h-9 w-28 rounded-xl" />
                    </div>

                    {/* Name, badges, bio */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Skeleton variant="text" className="h-7 w-48" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <div className="space-y-1.5 max-w-xl">
                            <Skeleton variant="text" className="h-3.5 w-full" />
                            <Skeleton variant="text" className="h-3.5 w-4/5" />
                        </div>
                    </div>

                    {/* Social links row */}
                    <div className="flex flex-wrap gap-3 mt-6">
                        <Skeleton className="h-7 w-24 rounded-lg" />
                        <Skeleton className="h-7 w-24 rounded-lg" />
                        <Skeleton className="h-7 w-24 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* 2-Column Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Academic details */}
                <div className="p-6 rounded-3xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-5">
                    <div className="border-b border-[var(--ui-border)] pb-3">
                        <Skeleton variant="text" className="h-4 w-32" />
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Skeleton variant="text" className="h-3 w-20" />
                            <Skeleton variant="text" className="h-4 w-36" />
                        </div>
                        <div className="space-y-1">
                            <Skeleton variant="text" className="h-3 w-16" />
                            <Skeleton variant="text" className="h-4 w-40" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Skeleton variant="text" className="h-3 w-12" />
                                <Skeleton variant="text" className="h-4 w-20" />
                            </div>
                            <div className="space-y-1">
                                <Skeleton variant="text" className="h-3 w-16" />
                                <Skeleton variant="text" className="h-4 w-16" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Account info */}
                <div className="p-6 rounded-3xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-5">
                    <div className="border-b border-[var(--ui-border)] pb-3">
                        <Skeleton variant="text" className="h-4 w-28" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                            <div className="space-y-1 flex-1">
                                <Skeleton variant="text" className="h-2.5 w-14" />
                                <Skeleton variant="text" className="h-4 w-44" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                            <div className="space-y-1 flex-1">
                                <Skeleton variant="text" className="h-2.5 w-14" />
                                <Skeleton variant="text" className="h-4 w-24" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                            <div className="space-y-1 flex-1">
                                <Skeleton variant="text" className="h-2.5 w-20" />
                                <Skeleton variant="text" className="h-4 w-32" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for data tables with header cells, row cells, and divider borders.
 */
export function TableSkeleton({
    rows = 5,
    cols = 4,
    bare = false,
    className = '',
}: {
    rows?: number;
    cols?: number;
    bare?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "overflow-x-auto",
                !bare && "rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)]",
                className
            )}
            aria-hidden="true"
        >
            <table className="min-w-full divide-y divide-[var(--ui-divider)]">
                <thead className="bg-[var(--ui-bg-elevated)]">
                    <tr>
                        {Array.from({ length: cols }).map((_, c) => (
                            <th key={c} scope="col" className="px-5 py-3.5 text-left">
                                <Skeleton variant="text" className="h-3 w-20 rounded" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ui-divider)]">
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c} className="px-5 py-3.5 whitespace-nowrap">
                                    <Skeleton
                                        variant="text"
                                        className={cn(
                                            "h-4 rounded",
                                            c === 0 ? "w-36" : c === cols - 1 ? "w-16" : "w-24"
                                        )}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Skeleton for settings pages.
 * Features section title, description, and input/card rows.
 */
export function SettingsSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={cn("space-y-6 max-w-3xl mx-auto w-full", className)} aria-hidden="true">
            {/* Section 1 */}
            <div className="p-6 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] space-y-5">
                {/* Title & description */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circle" className="h-5 w-5 shrink-0" />
                        <Skeleton variant="text" className="h-5 w-32" />
                    </div>
                    <Skeleton variant="text" className="h-3.5 w-72" />
                </div>

                {/* Card rows */}
                <div className="space-y-3 pt-1">
                    <div className="p-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 max-w-md">
                            <Skeleton variant="text" className="h-4 w-44" />
                            <Skeleton variant="text" className="h-3 w-64" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full shrink-0" />
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 max-w-md">
                            <Skeleton variant="text" className="h-4 w-40" />
                            <Skeleton variant="text" className="h-3 w-56" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full shrink-0" />
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 max-w-md">
                            <Skeleton variant="text" className="h-4 w-32" />
                            <Skeleton variant="text" className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
                    </div>
                </div>
            </div>

            {/* Section 2 */}
            <div className="p-6 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] space-y-5">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circle" className="h-5 w-5 shrink-0" />
                        <Skeleton variant="text" className="h-5 w-40" />
                    </div>
                    <Skeleton variant="text" className="h-3.5 w-60" />
                </div>
                <div className="space-y-3 pt-1">
                    <div className="p-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 max-w-md">
                            <Skeleton variant="text" className="h-4 w-36" />
                            <Skeleton variant="text" className="h-3 w-52" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full shrink-0" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Skeleton;
