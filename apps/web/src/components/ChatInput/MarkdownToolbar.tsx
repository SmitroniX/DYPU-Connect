'use client';

import { Bold, Italic, Code, Strikethrough, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

interface MarkdownToolbarProps {
    onWrapSelection: (before: string, after: string) => void;
}

export default function MarkdownToolbar({ onWrapSelection }: MarkdownToolbarProps) {
    return (
        <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--ui-text-muted)]">
            <motion.button
                whileHover={{ scale: 1.12, color: 'var(--ui-text)' }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => onWrapSelection('**', '**')}
                className="p-1.5 rounded-lg hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                title="Bold (Ctrl+B)"
            >
                <Bold className="w-4 h-4" />
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.12, color: 'var(--ui-text)' }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => onWrapSelection('*', '*')}
                className="p-1.5 rounded-lg hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                title="Italic (Ctrl+I)"
            >
                <Italic className="w-4 h-4" />
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.12, color: 'var(--ui-text)' }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => onWrapSelection('~~', '~~')}
                className="p-1.5 rounded-lg hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.12, color: 'var(--ui-text)' }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => onWrapSelection('> ', '')}
                className="p-1.5 rounded-lg hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                title="Blockquote"
            >
                <Quote className="w-4 h-4" />
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.12, color: 'var(--ui-text)' }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => onWrapSelection('`', '`')}
                className="p-1.5 rounded-lg hover:bg-[var(--ui-bg-hover)] transition-colors cursor-pointer"
                title="Inline code (Ctrl+K)"
            >
                <Code className="w-4 h-4" />
            </motion.button>
        </div>
    );
}
