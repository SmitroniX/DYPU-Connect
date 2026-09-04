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
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;
    const isNearLimit = messageLength > maxLength * 0.8;
    const progressColor = overLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-[var(--ui-accent)]';

    return (
        <div className="flex flex-col items-center justify-end pb-1 pr-1 shrink-0 gap-1.5 min-w-[44px]">
            {showCharCount && (
                <span className={`text-[9px] font-bold w-full text-center tracking-tighter ${overLimit ? 'text-red-500' : 'text-white/40'}`}>
                    {messageLength}
                </span>
            )}
            <motion.button
                whileHover={canSend && !overLimit ? { scale: 1.05 } : {}}
                whileTap={canSend && !overLimit ? { scale: 0.9 } : {}}
                type="button"
                onClick={onSend}
                disabled={!canSend || overLimit}
                className={`h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-500 shadow-2xl relative group/btn ${
                    canSend && !overLimit
                        ? 'bg-white text-black shadow-white/10 cursor-pointer'
                        : 'bg-[var(--ui-bg-active)] text-white/20 cursor-not-allowed border border-[var(--ui-border)]'
                }`}
                title="Send message"
            >
                {/* Send Glow Effect */}
                {canSend && !overLimit && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 rounded-2xl" />
                )}
                
                {/* Circular Progress */}
                {showProgress && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl overflow-hidden">
                        <svg className="w-[44px] h-[44px] transform -rotate-90 absolute" viewBox="0 0 44 44">
                            <circle
                                className="text-white/10 transition-all duration-300"
                                strokeWidth="2"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="22"
                                cy="22"
                            />
                            <circle
                                className={`${progressColor} transition-all duration-300`}
                                strokeWidth="2"
                                strokeDasharray={strokeDasharray}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="22"
                                cy="22"
                            />
                        </svg>
                    </div>
                )}
                
                <ArrowUp className={`w-5 h-5 transition-all duration-500 relative z-10 ${canSend && !overLimit ? 'group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110' : ''}`} />
            </motion.button>
        </div>
    );
}
