import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ── Deployment ────────────────────────────────────────── */
  // `output: "standalone"` produces a minimal self-contained build that works
  // on Vercel (default), Netlify (@netlify/plugin-nextjs), Docker, etc.
  output: "standalone",

  /* ── Images ────────────────────────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "media*.giphy.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
    // Netlify & Vercel both support their own image CDNs automatically,
    // but keeping unoptimized=false (default) lets them handle it.
  },

  /* ── Performance ───────────────────────────────────────── */
  reactStrictMode: true,
  poweredByHeader: false, // hide "X-Powered-By: Next.js" header

  /* ── Trailing slashes (consistent URLs across hosts) ──── */
  trailingSlash: false,
};

export default nextConfig;
