export interface GiphyGif {
    id: string;
    title: string;
    url: string;
    previewUrl: string;
}

interface GiphyApiItem {
    id?: string;
    title?: string;
    images?: {
        fixed_height?: { url?: string };
        fixed_width_downsampled?: { url?: string };
        original?: { url?: string };
        preview_gif?: { url?: string };
    };
}

interface GiphyApiResponse {
    data?: GiphyApiItem[];
}

function getGiphyApiKey(): string {
    return process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() ?? '';
}

export function hasGiphyApiKey(): boolean {
    return getGiphyApiKey().length > 0;
}

function mapItemToGif(item: GiphyApiItem): GiphyGif | null {
    const id = item.id?.trim();
    const title = item.title?.trim() || 'GIF';
    const images = item.images;
    const url =
        images?.fixed_height?.url
        || images?.original?.url
        || images?.fixed_width_downsampled?.url;
    const previewUrl =
        images?.preview_gif?.url
        || images?.fixed_width_downsampled?.url
        || images?.fixed_height?.url
        || url;

    if (!id || !url || !previewUrl) {
        return null;
    }

    return { id, title, url, previewUrl };
}

async function fetchGiphy(endpoint: 'search' | 'trending', query: string, limit: number): Promise<GiphyGif[]> {
    const apiKey = getGiphyApiKey();
    if (!apiKey) {
        return [];
    }

    const baseUrl = `https://api.giphy.com/v1/gifs/${endpoint}`;
    const params = new URLSearchParams({
        api_key: apiKey,
        limit: String(limit),
        rating: 'pg-13',
    });

    if (endpoint === 'search') {
        params.set('q', query);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to load GIFs from GIPHY.');
    }

    const payload = (await response.json()) as GiphyApiResponse;
    const data = Array.isArray(payload.data) ? payload.data : [];

    return data
        .map(mapItemToGif)
        .filter((gif): gif is GiphyGif => gif !== null);
}

export async function searchGiphyGifs(query: string, limit = 12): Promise<GiphyGif[]> {
    const trimmed = query.trim();
    if (!trimmed) {
        return fetchTrendingGiphyGifs(limit);
    }

    return fetchGiphy('search', trimmed, limit);
}

export async function fetchTrendingGiphyGifs(limit = 12): Promise<GiphyGif[]> {
    return fetchGiphy('trending', '', limit);
}
