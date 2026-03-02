'use client';

export default function ConfessionsError({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
            <div className="h-12 w-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                <span className="text-2xl">💬</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--ui-text)]">Confessions failed to load</h2>
            <p className="text-sm text-[var(--ui-text-muted)] max-w-md text-center">{error.message}</p>
            <button onClick={reset} className="px-4 py-2 rounded-lg bg-[var(--ui-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Try again
            </button>
        </div>
    );
}

