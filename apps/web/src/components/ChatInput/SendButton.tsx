'use client';

import { Send } from 'lucide-react';
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
    return (
        <div className="flex flex-col items-center justify-end pb-1 pr-1 shrink-0 gap-1 min-w-[42px]">
            {showCharCount && (
                <span className={`text-[10px] w-full text-center ${overLimit ? 'text-[var(--ui-danger)] font-bold' : 'text-[var(--ui-text-muted)]'}`}>
                    {messageLength}/{maxLength}
                </span>
            )}
            <motion.button
                whileHover={canSend && !overLimit ? { scale: 1.05, boxShadow: '0 0 15px var(--ui-accent-glow)' } : {}}
                whileTap={canSend && !overLimit ? { scale: 0.92 } : {}}
                type="button"
                onClick={onSend}
                disabled={!canSend || overLimit}
                className={`h-[42px] w-[42px] flex items-center justify-center rounded-full transition-all duration-300 shadow-lg ${
                    canSend && !overLimit
                        ? 'bg-gradient-to-br from-[#818cf8] to-[#4f46e5] text-white shadow-[#4f46e5]/25 cursor-pointer'
                        : 'bg-[var(--ui-bg-surface)] text-[var(--ui-text-muted)] opacity-50 cursor-not-allowed grayscale'
                }`}
                title="Send message"
            >
                <Send className={`w-[18px] h-[18px] ml-0.5 transition-transform duration-300 ${canSend && !overLimit ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' : ''}`} />
            </motion.button>
        </div>
    );
}
