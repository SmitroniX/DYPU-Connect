'use client';

import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circle' | 'block';
}

/**
 * A reusable Skeleton loading component with a shimmer effect.
 * 
 * @param className - Additional Tailwind classes for sizing and positioning
 * @param variant - Predefined shape variants: 'text', 'circle', or 'block'
 */
export default function Skeleton({ className, variant = 'block' }: SkeletonProps) {
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
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--ui-text)]/5 to-transparent"
            />
        </div>
    );
}
