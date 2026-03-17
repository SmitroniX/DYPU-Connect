import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from "@/components/CookieConsentBanner";
import SessionGuard from "@/components/SessionGuard";
import SystemProvider from '@/components/SystemProvider';
import { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",        // prevent FOIT (flash of invisible text)
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
    title: "DYPU Connect",
    description: "Exclusive social platform for DY Patil University",
    applicationName: "DYPU Connect",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "DYPU Connect",
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/logo.png",
    },
    manifest: "/manifest.json",
    openGraph: {
        title: "DYPU Connect",
        description: "Exclusive social platform for DY Patil University",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
            <head>
                {/* Preload Google Identity Services script to avoid popup-blocked issues */}
                {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                    <link rel="preload" href="https://accounts.google.com/gsi/client" as="script" />
                )}
                {/* Preconnect to Firebase and Google APIs for faster first requests */}
                <link rel="preconnect" href="https://firestore.googleapis.com" />
                <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
                <link rel="preconnect" href="https://lh3.googleusercontent.com" />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <AuthProvider>
                    <SystemProvider>
                        <Suspense fallback={<LoadingSpinner variant="full" message="Preparing your experience..." />}>
                            <SessionGuard>
                                {children}
                            </SessionGuard>
                        </Suspense>
                        <Toaster position="top-right" />
                        <CookieConsentBanner />
                    </SystemProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
