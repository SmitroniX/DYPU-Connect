// ---------------------------------------------------------------------------
// Client-Side Cache — in-memory + sessionStorage hybrid
//
// Provides a stale-while-revalidate caching layer for Firestore getDocs()
// calls. Real-time listeners (onSnapshot) don't need this — they're already
// live. This targets one-shot fetches that fire every page visit:
//   • Admin: users list, confession logs, anon chat logs
//   • Messages: user directory for new-chat picker
//   • Any future getDocs-based data
//
// Strategy:
//   1. Check in-memory Map first (fastest, lost on tab close)
//   2. Fall back to sessionStorage (survives SPA navigation)
//   3. If stale → return cached data immediately, refetch in background
//   4. If expired → fetch fresh, cache, return
// ---------------------------------------------------------------------------

type CacheEntry<T> = {
    data: T;
    timestamp: number;
    key: string;
};

interface CacheOptions {
    /** Time-to-live in ms. Default 60s. */
    ttl?: number;
    /** Stale-while-revalidate window in ms. Default 5 min.
     *  Data older than TTL but younger than TTL+SWR is returned
     *  immediately while a background refresh runs. */
    swr?: number;
    /** Persist to sessionStorage. Default true. */
    persist?: boolean;
}

const DEFAULT_TTL = 60_000;          // 1 minute
const DEFAULT_SWR = 5 * 60_000;     // 5 minutes
const STORAGE_PREFIX = 'dypu_cache_';

/* ── In-memory store ──────────────────────────────── */

const memoryCache = new Map<string, CacheEntry<unknown>>();

/* ── Background revalidation tracker ─────────────── */

const pendingRevalidations = new Set<string>();

/* ── Helpers ──────────────────────────────────────── */

function isFresh(entry: CacheEntry<unknown>, ttl: number): boolean {
    return Date.now() - entry.timestamp < ttl;
}

function isStaleButUsable(entry: CacheEntry<unknown>, ttl: number, swr: number): boolean {
    const age = Date.now() - entry.timestamp;
    return age >= ttl && age < ttl + swr;
}

function writeToStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
        sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
        // Storage full or unavailable — silent fail
    }
}

function readFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw) as CacheEntry<T>;
    } catch {
        return null;
    }
}

/* ── Core API ─────────────────────────────────────── */

/**
 * Get cached data, or execute the fetcher and cache the result.
 *
 * @example
 * ```ts
 * const users = await cacheGet('admin_users', fetchUsersFromFirestore, { ttl: 30_000 });
 * ```
 */
export async function cacheGet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
): Promise<T> {
    const ttl = options.ttl ?? DEFAULT_TTL;
    const swr = options.swr ?? DEFAULT_SWR;
    const persist = options.persist ?? true;

    // 1. Check memory
    let entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    // 2. Fall back to sessionStorage
    if (!entry && persist && typeof window !== 'undefined') {
        const stored = readFromStorage<T>(key);
        if (stored) {
            entry = stored;
            memoryCache.set(key, stored);
        }
    }

    // 3. Fresh hit → return immediately
    if (entry && isFresh(entry, ttl)) {
        return entry.data;
    }

    // 4. Stale-while-revalidate → return stale, refresh in background
    if (entry && isStaleButUsable(entry, ttl, swr)) {
        if (!pendingRevalidations.has(key)) {
            pendingRevalidations.add(key);
            fetcher()
                .then((freshData) => {
                    cacheSet(key, freshData, persist);
                })
                .catch(() => {
                    // Background refresh failed — keep stale data
                })
                .finally(() => {
                    pendingRevalidations.delete(key);
                });
        }
        return entry.data;
    }

    // 5. Expired or no cache → fetch fresh
    const freshData = await fetcher();
    cacheSet(key, freshData, persist);
    return freshData;
}

/**
 * Manually set/update a cache entry.
 */
export function cacheSet<T>(key: string, data: T, persist = true): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), key };
    memoryCache.set(key, entry);
    if (persist && typeof window !== 'undefined') {
        writeToStorage(key, entry);
    }
}

/**
 * Invalidate a specific cache key (force next fetch to go to Firestore).
 */
export function cacheInvalidate(key: string): void {
    memoryCache.delete(key);
    try {
        sessionStorage.removeItem(STORAGE_PREFIX + key);
    } catch { /* noop */ }
}

/**
 * Invalidate all keys matching a prefix.
 * @example cacheInvalidatePrefix('admin_') — clears all admin caches
 */
export function cacheInvalidatePrefix(prefix: string): void {
    for (const k of memoryCache.keys()) {
        if (k.startsWith(prefix)) {
            memoryCache.delete(k);
        }
    }
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const storageKey = sessionStorage.key(i);
            if (storageKey?.startsWith(STORAGE_PREFIX + prefix)) {
                sessionStorage.removeItem(storageKey);
            }
        }
    } catch { /* noop */ }
}

/**
 * Clear the entire cache.
 */
export function cacheClearAll(): void {
    memoryCache.clear();
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const storageKey = sessionStorage.key(i);
            if (storageKey?.startsWith(STORAGE_PREFIX)) {
                sessionStorage.removeItem(storageKey);
            }
        }
    } catch { /* noop */ }
}

/**
 * Check if a key exists and is fresh.
 */
export function cacheHas(key: string, ttl = DEFAULT_TTL): boolean {
    const entry = memoryCache.get(key);
    if (entry && isFresh(entry, ttl)) return true;

    if (typeof window !== 'undefined') {
        const stored = readFromStorage(key);
        if (stored && isFresh(stored, ttl)) return true;
    }

    return false;
}

/**
 * Get cache stats for debugging / admin dashboard.
 */
export function cacheStats(): { memoryKeys: number; storageKeys: number } {
    let storageKeys = 0;
    try {
        for (let i = 0; i < sessionStorage.length; i++) {
            if (sessionStorage.key(i)?.startsWith(STORAGE_PREFIX)) {
                storageKeys++;
            }
        }
    } catch { /* noop */ }

    return {
        memoryKeys: memoryCache.size,
        storageKeys,
    };
}

