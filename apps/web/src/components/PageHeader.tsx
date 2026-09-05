'use client';

interface PageHeaderProps {
    /** Page title */
    title: string;
    /** Optional subtitle / description */
    description?: string;
    /** Optional icon displayed before the title */
    icon?: React.ReactNode;
    /** Optional right-side content (buttons, badges, etc.) */
    children?: React.ReactNode;
}

export default function PageHeader({ title, description, icon, children }: PageHeaderProps) {
    return (
        <div 
            className="page-header sticky top-0 z-30 px-4 pb-4 sm:px-8 bg-[var(--ui-bg-base)]/60 backdrop-blur-2xl border-b border-[var(--ui-divider)]/50"
            style={{ paddingTop: '16px' }}
        >
            {/* Subtle top glare */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--ui-border)] to-transparent" />
            
            <div className="flex items-center gap-4 min-w-0 flex-1 max-w-5xl mx-auto">
                {icon && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ui-bg-surface)] to-[var(--ui-bg-elevated)] text-[var(--ui-accent)] shrink-0 shadow-sm border border-[var(--ui-border)] ring-1 ring-black/5">
                        {icon}
                    </div>
                )}
                <div className="flex flex-col min-w-0 justify-center">
                    <h1 className="text-lg sm:text-xl font-extrabold text-[var(--ui-text)] truncate tracking-tight drop-shadow-sm">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-[12px] font-semibold text-[var(--ui-text-muted)] truncate tracking-wide mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
                
                {children && (
                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
