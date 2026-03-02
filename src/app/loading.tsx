export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-base)]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-[var(--ui-border)] border-t-[var(--ui-accent)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--ui-text-muted)] animate-pulse">Loading…</p>
            </div>
        </div>
    );
}

