# Project Context: DYPU-Connect (Refactoring Phase)

**Project Name:** DYPU-Connect
**Primary Goal:** Refactor and improve all systems, features, and UI/UX to ensure a modern, error-free, and high-quality social platform for DY Patil University.
**Target Audience:** Students and staff of DY Patil University.

## Current State
- **Framework:** Next.js 16.1.6 (App Router), React 19.2.3.
- **Backend:** Firebase (Auth, Firestore, Storage), Firebase Data Connect (PostgreSQL/GraphQL).
- **Styling:** Tailwind CSS 4.
- **State Management:** Zustand 5.
- **Key Features:** Rich chat (public/private/group), media sharing, global search, anonymous modes, confessions, moderation, mobile/PWA/desktop support.

## Refactoring Objectives
1.  **Code Quality:** Improve type safety, modularity, and consistency across the codebase.
2.  **Performance:** Optimize real-time message handling, media loading, and navigation using modern Next.js 16/React 19 patterns (`useOptimistic`, Server Components, etc.).
3.  **UI/UX:** Enhancing the design to be more polished and intuitive ("nice design").
4.  **Stability:** Eliminate existing errors and improve error handling/logging ("error-less").

## Tech Stack (Target)
- **Core:** Next.js 16 (App Router, Turbopack, PPR), React 19 (Compiler, Actions).
- **Backend:** Firebase Data Connect (Primary DB), Cloud Firestore (Auxiliary).
- **Security:** App Check, Web Crypto API (for E2EE if applicable).
- **UI:** Tailwind CSS 4, Lucide Icons, Framer Motion (for polished animations).
- **Optimization:** React Virtualization for long lists, Client-side media compression.

## Success Criteria
- **Quality:** Significant reduction in lint/type errors and improved code readability.
- **Performance:** Instant-feeling UI via optimistic updates and efficient caching.
- **Design:** Modern, cohesive, and "premium" look and feel.
- **Reliability:** Comprehensive error handling and 0 known critical bugs.
