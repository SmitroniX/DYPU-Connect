# Technology Stack (2025)

**Project:** DYPU-Connect
**Researched:** May 2025

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.1 | Web Framework | Turbopack stable, `use cache`, PPR, optimized App Router. |
| React | 19.2 | UI Library | React Compiler (automatic memoization), Actions, `useOptimistic`. |
| TypeScript | 5.5+ | Language | Type-safe development with generated SDKs. |

### Database & Backend
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Data Connect | Public Preview | Primary DB | Relational (PostgreSQL), GraphQL interface, type-safe generated SDKs. |
| Cloud Firestore | - | Auxiliary DB | For simple high-frequency counters or legacy sync if needed. |
| Cloud SQL | - | PostgreSQL Engine | Backing engine for Data Connect. |

### Authentication & Security
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Auth | - | Identity | Anonymous auth, Google/Email providers, Identity Platform features. |
| Firebase App Check | - | Security | Protects API from bots, unauthorized clients, and replay attacks. |
| Web Crypto API | Native | Encryption | Client-side E2EE using SubtleCrypto (AES-GCM/RSA-OAEP). |

### Infrastructure & Media
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Hosting | - | Deployment | Global CDN, Hosting Rewrites for media delivery. |
| Firebase Storage | - | Media Storage | Binary storage with Resize Images Extension. |
| Cloud Functions v2 | - | Background Tasks | For media processing triggers, account cleanup, and AI moderation. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | Latest | Icons | Standard UI iconography. |
| `framer-motion` | 11+ | Animation | Real-time transitions and interactive UI elements. |
| `tanstack/react-virtual` | 3+ | Virtualization | Rendering long chat histories without performance hits. |
| `compressorjs` | Latest | Compression | Compressing media on-client before upload. |
| `blurhash` | Latest | Placeholder | Instant blurred placeholders for media messages. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Database | Firebase Data Connect | Cloud Firestore | Firestore lacks relational power (joins/complex permissions) needed for large apps. |
| Bundler | Turbopack | Webpack | Turbopack is now 10x faster in Next.js 16 and stable. |
| State | `useOptimistic` / Actions | Redux / Zustand | React 19 native hooks handle mutation state and optimistic UI more efficiently. |

## Installation

```bash
# Core
npx create-next-app@latest . --typescript --tailwind --eslint

# Firebase & SDKs
npm install firebase firebase-admin @firebase/dataconnect
firebase init dataconnect

# UI & Utilities
npm install lucide-react framer-motion @tanstack/react-virtual compressorjs blurhash
```

## Sources

- [Next.js 16 Official Blog](https://nextjs.org/blog) (HIGH)
- [React 19 Documentation](https://react.dev) (HIGH)
- [Firebase Data Connect Documentation](https://firebase.google.com/docs/data-connect) (HIGH)
- [Google Web Search (May 2025 context)](MEDIUM)
