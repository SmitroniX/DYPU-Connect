import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from "@/components/CookieConsentBanner";
import SessionGuard from "@/components/SessionGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DYPU Connect",
    description: "Exclusive social platform for DY Patil University",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <AuthProvider>
                    <SessionGuard />
                    {children}
                    <Toaster position="top-right" />
                    <CookieConsentBanner />
                </AuthProvider>
            </body>
        </html>
    );
}
