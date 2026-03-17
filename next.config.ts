import type { NextConfig } from "next";

const runtimeCaching = require("next-pwa/cache");

// Specialized caching rules for Firebase services and other media
runtimeCaching.unshift(
  {
    urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*$/,
    handler: "NetworkFirst",
    options: {
      cacheName: "firestore-data",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
      networkTimeoutSeconds: 10,
    },
  },
  {
    urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*$/,
    handler: "CacheFirst",
    options: {
      cacheName: "firebase-storage",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  {
    urlPattern: /^https:\/\/media.*\.giphy\.com\/.*$/,
    handler: "CacheFirst",
    options: {
      cacheName: "giphy-media",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      },
    },
  }
);

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,
});

const nextConfig: NextConfig = {
  /* ── Deployment ────────────────────────────────────────── */
  output: "standalone",

  /* ── Performance ───────────────────────────────────────── */
  experimental: {
    ppr: true,
    dynamicIO: true,
  },
  reactStrictMode: true,
  poweredByHeader: false, 

  /* ── Images ────────────────────────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "media*.giphy.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },

  /* ── Trailing slashes ──────────────────────────────────── */
  trailingSlash: false,

  /* ── Security Headers ──────────────────────────────────── */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://*.firebaseio.com https://*.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.giphy.com wss://*.firebaseio.com https://www.google-analytics.com wss:",
              "media-src 'self' blob:",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        source: "/(.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
