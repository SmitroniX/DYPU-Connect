'use client';

import { Bold, Italic, Code } from 'lucide-react';
import { motion } from 'framer-motion';

interface MarkdownToolbarProps {
    onWrapSelection: (before: string, after: string) => void;
}

export default function MarkdownToolbar({ onWrapSelection }: MarkdownToolbarProps) {
    return (
        <div className="flex items-center gap-1 px-3 pt-2 pb-0 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <motion.button
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onWrapSelection('**', '**')}
                className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                title="Bold (Ctrl+B)"
            >
                <Bold className="w-4 h-4" />
            </motion.button>
            <motion.button
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onWrapSelection('*', '*')}
                className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                title="Italic (Ctrl+I)"
            >
                <Italic className="w-4 h-4" />
            </motion.button>
            <motion.button
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onWrapSelection('`', '`')}
                className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                title="Inline code"
            >
                <Code className="w-4 h-4" />
            </motion.button>
        </div>
    );
}
