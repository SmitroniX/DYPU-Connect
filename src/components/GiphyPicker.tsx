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
                className="bg-gray-100 text-gray-700 p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors flex shrink-0 items-center justify-center w-10 h-10"
                title={giphyEnabled ? 'Insert GIF' : 'Set NEXT_PUBLIC_GIPHY_API_KEY to enable GIFs'}
            >
                <ImageIcon className="w-4 h-4" />
            </button>

            {open && (
                <div className={`absolute z-40 bottom-12 ${panelAlignment} w-[320px] rounded-xl border border-gray-200 bg-white shadow-xl p-3`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">GIPHY</h3>
                        <button
                            type="button"
                            className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="relative mb-3">
                        <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search GIFs..."
                            className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {loading && (
                        <div className="py-6 flex items-center justify-center text-gray-500 text-sm gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading GIFs...
                        </div>
                    )}

                    {!loading && error && (
                        <p className="text-xs text-red-600 py-2">{error}</p>
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
                                    className="group rounded-md overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors"
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
                                <p className="col-span-3 text-xs text-gray-500 py-4 text-center">No GIFs found.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
