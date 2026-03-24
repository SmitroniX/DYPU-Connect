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
    onSend,
}: SendButtonProps) {
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
                className={`h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-500 shadow-2xl relative overflow-hidden group/btn ${
                    canSend && !overLimit
                        ? 'bg-white text-black shadow-white/10 cursor-pointer'
                        : 'bg-white/10 text-white/20 cursor-not-allowed border border-white/5'
                }`}
                title="Send message"
            >
                {/* Send Glow Effect */}
                {canSend && !overLimit && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                )}
                
                <ArrowUp className={`w-5 h-5 transition-all duration-500 ${canSend && !overLimit ? 'group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110' : ''}`} />
            </motion.button>
        </div>
    );
}
