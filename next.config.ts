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
  poweredByHeader: false, // hide "X-Powered-By: Next.js" header (Apache ServerTokens Prod)

  /* ── Trailing slashes (consistent URLs across hosts) ──── */
  trailingSlash: false,

  /* ── Security Headers — CrowdStrike Falcon / Apache mod_security grade ── */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
