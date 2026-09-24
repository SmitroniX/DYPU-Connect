# Task List: Loading Animations, Skeletons & UI Motion Polish

### Phase 1: Foundation — Core Loaders & Skeletons
- [x] Task 1: Enhance `LoadingSpinner` with Size, Tone, and Button Variant (`apps/web/src/components/LoadingSpinner.tsx`)
- [x] Task 2: Extend `Skeleton` with Domain Layout Presets (`apps/web/src/components/Skeleton.tsx`)
- [x] Checkpoint 1: Foundation (Typecheck & Unit Tests pass)

### Phase 2: User-Facing Pages — Skeletons & Layout Stability
- [x] Task 3: Upgrade Confessions & Groups Page Loading (`apps/web/src/app/confessions/page.tsx`, `apps/web/src/app/groups/page.tsx`)
- [x] Task 4: Upgrade Chat & Message Streams Loading (`apps/web/src/app/messages/[chatId]/page.tsx`, `apps/web/src/app/public-chat/page.tsx`, `apps/web/src/app/anonymous-chat/page.tsx`)
- [x] Task 5: Upgrade Profile & Settings Initial States (`apps/web/src/app/profile/page.tsx`, `apps/web/src/app/settings/page.tsx`)
- [x] Checkpoint 2: User-Facing Pages (Clean build & no layout shifts)

### Phase 3: Unification of Spinners & Button Loading States
- [x] Task 6: Standardize Button & Sub-Panel Spinners in Settings & Profile Edit (`apps/web/src/app/settings/page.tsx`, `apps/web/src/app/profile/edit/page.tsx`)
- [x] Task 7: Standardize Admin Dashboard Loaders & Tables (`apps/web/src/app/admin/**`)
- [x] Task 8: Standardize Popups, Search & Auth Page Loaders (`apps/web/src/components/ProfilePopup.tsx`, `apps/web/src/components/GlobalSearch.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/verify-email/page.tsx`)
- [x] Checkpoint 3: Admin & Components (All ad-hoc spinners replaced)

### Phase 4: UI Motion, Transitions & Micro-Interactions
- [x] Task 9: Polish CSS Transitions & Reduced-Motion Accessibility (`apps/web/src/app/globals.css`)
- [x] Checkpoint 4: Complete Verification (ESLint 0 errors, TypeScript 0 errors, all tests pass, production build succeeds)
