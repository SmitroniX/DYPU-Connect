'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Search, X } from 'lucide-react';
import type { GiphyGif } from '@/lib/giphy';
import { fetchTrendingGiphyGifs, hasGiphyApiKey, searchGiphyGifs } from '@/lib/giphy';

interface GiphyPickerProps {
    onSelect: (gif: GiphyGif) => void;
    disabled?: boolean;
    align?: 'left' | 'right';
}

export default function GiphyPicker({ onSelect, disabled, align = 'left' }: GiphyPickerProps) {
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

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                disabled={disabled || !giphyEnabled}
                onClick={() => setOpen((prev) => !prev)}
                className="bg-white/10 text-slate-400 p-2 rounded-full hover:bg-white/15 hover:text-white disabled:opacity-50 transition-all flex shrink-0 items-center justify-center w-10 h-10 border border-white/10"
                title={giphyEnabled ? 'Insert GIF' : 'Set NEXT_PUBLIC_GIPHY_API_KEY to enable GIFs'}
            >
                <ImageIcon className="w-4 h-4" />
            </button>

            {open && (
                <div className={`absolute z-40 bottom-12 ${panelAlignment} w-[320px] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white">GIPHY</h3>
                        <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="relative mb-3">
                        <Search className="h-4 w-4 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search GIFs..."
                            className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all"
                        />
                    </div>

                    {loading && (
                        <div className="py-6 flex items-center justify-center text-slate-400 text-sm gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading GIFs...
                        </div>
                    )}

                    {!loading && error && (
                        <p className="text-xs text-red-400 py-2">{error}</p>
                    )}

                    {!loading && !error && (
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                            {gifs.map((gif) => (
                                <button
                                    type="button"
                                    key={gif.id}
                                    onClick={() => {
                                        onSelect(gif);
                                        setOpen(false);
                                    }}
                                    className="group rounded-lg overflow-hidden border border-white/10 hover:border-violet-500/40 transition-all hover:scale-105"
                                    title={gif.title}
                                >
                                    <img
                                        src={gif.previewUrl}
                                        alt={gif.title}
                                        className="h-20 w-full object-cover object-center"
                                    />
                                </button>
                            ))}
                            {gifs.length === 0 && (
                                <p className="col-span-3 text-xs text-slate-500 py-4 text-center">No GIFs found.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
