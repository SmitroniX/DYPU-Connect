'use client';

import { useEffect, useRef, useState } from 'react';
import { Smile, X } from 'lucide-react';
import { EMOJI_DATA } from '@/lib/emojis';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    disabled?: boolean;
    align?: 'left' | 'right';
}

export default function EmojiPicker({ onSelect, disabled, align = 'left' }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleOutsideClick = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    const panelAlignment = align === 'right' ? 'right-0' : 'left-0';

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                className="text-[var(--ui-text-muted)] p-2 rounded-lg hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] disabled:opacity-50 transition-all flex shrink-0 items-center justify-center"
                title="Insert emoji"
            >
                <Smile className="w-5 h-5" />
            </button>

            {open && (
                <div className={`absolute z-50 bottom-12 ${panelAlignment} w-[320px] rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] shadow-2xl overflow-hidden`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 pt-3 pb-2">
                        <h3 className="text-sm font-semibold text-[var(--ui-text)]">Emoji</h3>
                        <button
                            type="button"
                            className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-colors"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-0.5 px-2 pb-2 overflow-x-auto">
                        {EMOJI_DATA.map((cat, i) => (
                            <button
                                key={cat.name}
                                type="button"
                                onClick={() => setActiveCategory(i)}
                                className={`flex-shrink-0 px-2 py-1.5 rounded-md text-base transition-colors ${
                                    activeCategory === i
                                        ? 'bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/30'
                                        : 'hover:bg-[var(--ui-bg-hover)]'
                                }`}
                                title={cat.name}
                            >
                                {cat.icon}
                            </button>
                        ))}
                    </div>

                    {/* Emoji grid */}
                    <div className="px-2 pb-3">
                        <p className="text-[10px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5 px-1">
                            {EMOJI_DATA[activeCategory].name}
                        </p>
                        <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                            {EMOJI_DATA[activeCategory].emojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                        onSelect(emoji);
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-center h-9 w-9 rounded-md text-xl hover:bg-[var(--ui-bg-hover)] hover:scale-125 transition-all duration-150"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

