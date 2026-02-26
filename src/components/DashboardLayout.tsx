import Sidebar from '../components/Sidebar';
import ProtectedRoute from '../components/ProtectedRoute';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
                {/* Sidebar for desktop */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col shadow-sm">
                    <Sidebar />
                </div>

                {/* Mobile header (Optional enhancements like a hamburger could go here) */}
                <div className="lg:hidden sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6">
                    <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
                        DYPU Connect
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="py-10 lg:pl-72 flex-1 w-full relative h-[100dvh]">
                    <div className="px-4 sm:px-6 lg:px-8 h-full">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
