import Skeleton from '@/components/Skeleton';

export default function Loading() {
    return (
        <div className="flex h-screen bg-[var(--ui-bg-base)] overflow-hidden">
            {/* Sidebar Skeleton */}
            <div className="hidden lg:flex flex-col w-64 border-r border-[var(--ui-divider)] bg-[var(--ui-bg-surface)] p-4 space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Skeleton variant="circle" className="w-8 h-8" />
                    <Skeleton variant="text" className="w-24 h-5" />
                </div>
                
                <div className="space-y-4 pt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-2">
                            <Skeleton variant="circle" className="w-5 h-5" />
                            <Skeleton variant="text" className="flex-1 h-4" />
                        </div>
                    ))}
                </div>

                <div className="mt-auto flex items-center gap-3 p-2 border-t border-[var(--ui-divider)] pt-4">
                    <Skeleton variant="circle" className="w-8 h-8" />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" className="w-2/3 h-3" />
                        <Skeleton variant="text" className="w-1/2 h-2" />
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header Skeleton */}
                <div className="h-14 border-b border-[var(--ui-divider)] bg-[var(--ui-bg-surface)] flex items-center justify-between px-6">
                    <Skeleton variant="text" className="w-32 h-6" />
                    <div className="flex gap-3">
                        <Skeleton variant="circle" className="w-8 h-8" />
                        <Skeleton variant="circle" className="w-8 h-8" />
                    </div>
                </div>

                {/* Body Skeleton */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} variant="block" className="h-32" />
                        ))}
                    </div>
                    
                    <div className="space-y-4">
                        <Skeleton variant="text" className="w-1/4 h-6 mb-4" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <Skeleton variant="text" className="w-1/6 h-4" />
                                    <Skeleton variant="text" className="w-full h-3" />
                                    <Skeleton variant="text" className="w-2/3 h-3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
