'use client';

import { useCallback, useEffect, useMemo, useRef, useState, cloneElement, ReactElement } from 'react';
import { Image as ImageIcon, Loader2, Search, X } from 'lucide-react';
import type { GiphyGif } from '@/lib/giphy';
import { fetchTrendingGiphyGifs, hasGiphyApiKey, searchGiphyGifs } from '@/lib/giphy';

interface GiphyPickerProps {
    onSelect: (gif: GiphyGif) => void;
    disabled?: boolean;
    align?: 'left' | 'right';
    trigger?: ReactElement<any>;
}

export default function GiphyPicker({ onSelect, disabled, align = 'left', trigger }: GiphyPickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const giphyEnabled = useMemo(() => hasGiphyApiKey(), []);

    const loadGifs = useCallback(async (searchText: string) => {
        if (!giphyEnabled) {
            setError('GIPHY key missing.');
            setGifs([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const next = searchText.trim()
                ? await searchGiphyGifs(searchText, 12)
                : await fetchTrendingGiphyGifs(12);
            setGifs(next);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to load GIFs.');
        } finally {
            setLoading(false);
        }
    }, [giphyEnabled]);

    useEffect(() => {
        if (!open) return;

        const timeout = window.setTimeout(() => {
            void loadGifs(query);
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [open, query, loadGifs]);

    useEffect(() => {
        if (!open) return;

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!wrapperRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    const panelAlignment = align === 'right' ? 'right-0' : 'left-0';

    const defaultTrigger = (
        <button
            type="button"
            disabled={disabled || !giphyEnabled}
            className="bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] p-2 rounded-lg hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] disabled:opacity-50 transition-all flex shrink-0 items-center justify-center w-10 h-10 border border-[var(--ui-border)]"
            title={giphyEnabled ? 'Insert GIF' : 'Set NEXT_PUBLIC_GIPHY_API_KEY to enable GIFs'}
        >
            <ImageIcon className="w-4 h-4" />
        </button>
    );

    const triggerElement = trigger 
        ? cloneElement(trigger, { 
            onClick: (e: any) => {
                trigger.props.onClick?.(e);
                if (!disabled && giphyEnabled) setOpen(!open);
            },
            disabled: disabled || !giphyEnabled
          }) 
        : cloneElement(defaultTrigger, { onClick: () => setOpen(!open) });

    return (
        <div className="relative" ref={wrapperRef}>
            {triggerElement}

            {open && (
                <div className={`absolute z-40 bottom-14 ${panelAlignment} w-[320px] rounded-2xl border border-[var(--ui-border)] bg-zinc-900/90 backdrop-blur-xl shadow-2xl p-4 animate-[scale-in_0.2s_ease-out]`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-60">GIPHY Express</h3>
                        <button
                            type="button"
                            className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-[var(--ui-bg-hover)] transition-colors"
                            onClick={() => setOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative mb-4">
                        <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search GIFs..."
                            className="w-full bg-[var(--ui-bg-hover)] border border-[var(--ui-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[var(--ui-accent)]/50 transition-colors placeholder:text-zinc-600"
                        />
                    </div>

                    {loading && (
                        <div className="py-10 flex flex-col items-center justify-center text-zinc-500 text-xs gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-[var(--ui-accent)]" /> 
                            <span>Fetching GIFs...</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="py-10 text-center">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                            {gifs.map((gif) => (
                                <button
                                    type="button"
                                    key={gif.id}
                                    onClick={() => {
                                        onSelect(gif);
                                        setOpen(false);
                                    }}
                                    className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--ui-bg-hover)] transition-all active:scale-95"
                                    title={gif.title}
                                >
                                    <img
                                        src={gif.previewUrl}
                                        alt={gif.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                            {gifs.length === 0 && (
                                <p className="col-span-2 text-xs text-zinc-600 py-10 text-center font-medium">No GIFs matching your search.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
