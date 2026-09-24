'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
    /** Page title */
    title: string;
    /** Optional subtitle / description */
    description?: string;
    /** Optional icon displayed before the title */
    icon?: React.ReactNode;
    /** Optional back button click handler */
    onBack?: () => void;
    /** Optional back link destination */
    backHref?: string;
    /** Whether to show back button (defaults to true if onBack or backHref is provided) */
    showBack?: boolean;
    /** Optional right-side content (buttons, badges, etc.) */
    children?: React.ReactNode;
}

export default function PageHeader({ 
    title, 
    description, 
    icon, 
    onBack, 
    backHref, 
    showBack, 
    children 
}: PageHeaderProps) {
    const router = useRouter();
    const hasBack = showBack ?? Boolean(onBack || backHref);

    const handleBackClick = () => {
        if (onBack) {
            onBack();
        } else if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <div 
            className="page-header sticky top-0 z-30 px-4 pb-3.5 sm:px-8 bg-[var(--ui-bg-base)]/75 dark:bg-[#09090b]/80 backdrop-blur-2xl border-b border-[var(--ui-border)]/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)] transition-colors"
            style={{ paddingTop: '16px' }}
        >
            {/* Subtle top glare */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 max-w-5xl mx-auto">
                {hasBack && (
                    backHref ? (
                        <Link href={backHref} aria-label="Go back">
                            <motion.div
                                whileHover={{ x: -2.5, scale: 1.02 }}
                                whileTap={{ scale: 0.92 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                                className="group flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-bg-surface)] hover:bg-[var(--ui-bg-hover)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] shadow-sm shrink-0 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                            </motion.div>
                        </Link>
                    ) : (
                        <motion.button
                            type="button"
                            onClick={handleBackClick}
                            whileHover={{ x: -2.5, scale: 1.02 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                            aria-label="Go back"
                            className="group flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-bg-surface)] hover:bg-[var(--ui-bg-hover)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] shadow-sm shrink-0 transition-colors focus:outline-none"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        </motion.button>
                    )
                )}

                {icon && (
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ui-accent)]/20 via-[var(--ui-accent)]/10 to-transparent text-[var(--ui-accent)] shrink-0 shadow-sm shadow-[var(--ui-accent-dim)] border border-[var(--ui-accent)]/25 ring-1 ring-white/20 dark:ring-white/10">
                        {icon}
                    </div>
                )}

                <div className="flex flex-col min-w-0 justify-center">
                    <h1 className="text-lg sm:text-xl font-black text-[var(--ui-text)] truncate tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-[12px] sm:text-[13px] font-medium text-[var(--ui-text-muted)] truncate tracking-normal mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
                
                {children && (
                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
