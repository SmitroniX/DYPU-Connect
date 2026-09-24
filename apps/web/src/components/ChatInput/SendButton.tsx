'use client';

import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface SendButtonProps {
    canSend: boolean;
    overLimit: boolean;
    showCharCount: boolean;
    messageLength: number;
    maxLength: number;
    onSend: () => void;
}

export default function SendButton({
    canSend,
    overLimit,
    showCharCount,
    messageLength,
    maxLength,
    onSend,
}: SendButtonProps) {
    const progress = Math.min(100, Math.max(0, (messageLength / maxLength) * 100));
    const showProgress = messageLength > 0;
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;
    const isNearLimit = messageLength > maxLength * 0.8;
    const progressColor = overLimit ? 'stroke-red-500' : isNearLimit ? 'stroke-amber-400' : 'stroke-[var(--ui-accent)]';

    return (
        <div className="relative flex flex-col items-center justify-center shrink-0">
            {showCharCount && (
                <span className={`absolute -top-4 text-[9px] font-bold tracking-tighter ${overLimit ? 'text-red-500 font-extrabold animate-pulse' : 'text-[var(--ui-text-muted)]'}`}>
                    {messageLength}
                </span>
            )}
            <motion.button
                whileHover={canSend && !overLimit ? { scale: 1.08, y: -1 } : {}}
                whileTap={canSend && !overLimit ? { scale: 0.92 } : {}}
                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                type="button"
                onClick={onSend}
                disabled={!canSend || overLimit}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all duration-300 relative group/btn shrink-0 ${
                    canSend && !overLimit
                        ? 'bg-gradient-to-tr from-[var(--ui-accent)] to-[var(--ui-accent-hover)] text-white shadow-lg shadow-[var(--ui-accent)]/35 cursor-pointer ring-2 ring-[var(--ui-accent)]/20'
                        : 'bg-[var(--ui-bg-input)] text-[var(--ui-text-muted)]/30 cursor-not-allowed border border-[var(--ui-border)]/40'
                }`}
                title={canSend ? 'Send message' : 'Type a message to send'}
            >
                {/* Circular Character Limit Progress */}
                {showProgress && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full overflow-hidden">
                        <svg className="w-9 h-9 sm:w-10 sm:h-10 transform -rotate-90 absolute" viewBox="0 0 40 40">
                            <circle
                                className="stroke-[var(--ui-border)]/40 transition-colors"
                                strokeWidth="2"
                                fill="transparent"
                                r={radius}
                                cx="20"
                                cy="20"
                            />
                            <circle
                                className={`${progressColor} transition-all duration-300`}
                                strokeWidth="2.2"
                                strokeDasharray={strokeDasharray}
                                strokeLinecap="round"
                                fill="transparent"
                                r={radius}
                                cx="20"
                                cy="20"
                            />
                        </svg>
                    </div>
                )}
                
                <ArrowUp className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 relative z-10 ${canSend && !overLimit ? 'group-hover/btn:-translate-y-0.5' : ''}`} />
            </motion.button>
        </div>
    );
}
