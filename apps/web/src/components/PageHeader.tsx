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
        <div className="page-header">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {icon && (
                    <span className="text-[var(--ui-text-muted)] shrink-0">{icon}</span>
                )}
                <h1 className="text-[15px] font-semibold text-[var(--ui-text)] truncate">
                    {title}
                </h1>
                {description && (
                    <>
                        <div className="w-px h-4 bg-[var(--ui-divider)] mx-1 shrink-0" />
                        <p className="text-sm text-[var(--ui-text-muted)] truncate">
                            {description}
                        </p>
                    </>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {children}
                </div>
            )}
        </div>
    );
}

