'use client';

export default function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-3.5 py-2 bg-[var(--ui-bg-surface)] text-[var(--ui-text-muted)] rounded-2xl rounded-bl-sm border border-[var(--ui-border)]/50 w-fit mt-1 shadow-sm">
            <div className="w-[5px] h-[5px] bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-[5px] h-[5px] bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-[5px] h-[5px] bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
