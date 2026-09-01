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
        <div className="page-header sticky top-0 z-30 bg-[var(--ui-bg-surface)]/70 backdrop-blur-3xl border-b border-[var(--ui-border)] shadow-[0_4px_32px_0_rgba(0,0,0,0.1)] px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] sm:px-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {icon && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-bg-elevated)] text-[var(--ui-accent)] shrink-0 shadow-sm border border-[var(--ui-border)]">
                        {icon}
                    </div>
                )}
                <div className="flex flex-col min-w-0">
                    <h1 className="text-[15px] font-bold text-[var(--ui-text)] truncate tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-[11px] font-medium text-[var(--ui-text-muted)] truncate uppercase tracking-wider">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {children && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                    {children}
                </div>
            )}
        </div>
    );
}

