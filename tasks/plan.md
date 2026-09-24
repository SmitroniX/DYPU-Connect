# Implementation Plan: Unified Loading Animations, Skeletons & UI Motion Polish

## Overview

This plan comprehensively overhauls the loading states, skeleton screens, button indicators, and UI motion across the DYPU-Connect Next.js web application (`apps/web`). It eliminates jarring layout shifts, replaces 20+ ad-hoc `animate-spin` divs with standardized components, provides domain-tailored skeleton presets, and polishes page/micro-interaction motions.

---

## Architecture & Design Decisions

1. **Primitive & Component Unification**:
   - **`Skeleton.tsx`**: Upgrade from basic primitives to include rich domain skeleton presets (`ConfessionFeedSkeleton`, `ChatMessageSkeleton`, `GroupCardSkeleton`, `ProfileSkeleton`, `TableSkeleton`, `SettingsSkeleton`). All skeletons use shimmering gradient sweeps with CSS variable-driven glassmorphism (`--ui-bg-elevated`, `--ui-border`).
   - **`LoadingSpinner.tsx`**: Support `variant="full" | "inline" | "minimal" | "button"` and customizable `size` (`xs`, `sm`, `md`, `lg`) and `tone` (`accent`, `white`, `danger`).
   - **`ButtonSpinner` / Button States**: Add reusable spinner for buttons that maintains button dimensions, prevents label jumping, and automatically disables clicks during inflight actions.

2. **Elimination of Ad-Hoc Spinners**:
   - Standardize all 20+ inline spinners found across:
     - `app/admin/**` (users, analytics, content, reports, announcements, confessions, anonymous-chat, settings, moderation-rules)
     - `app/settings/page.tsx` (login activity, session revocation, avatar upload, password change)
     - `app/profile/edit/page.tsx`
     - `components/ProfilePopup.tsx`, `components/GlobalSearch.tsx`, `app/login/page.tsx`, `app/verify-email/page.tsx`.

3. **Skeleton-Driven Feed & View Transitions**:
   - Replace full-page blank flash and centered spinners on initial query fetches with exact layout-matching skeletons:
     - `app/confessions/page.tsx`: Replace custom inline `animate-pulse` divs with `<ConfessionFeedSkeleton />`.
     - `app/groups/page.tsx`: Replace `LoadingSpinner variant="full"` with `<GroupCardSkeleton />` grid.
     - `app/messages/[chatId]/page.tsx`: Replace center spinner with `<ChatMessageSkeleton count={5} />`.
     - `app/public-chat/page.tsx` & `app/anonymous-chat/page.tsx`: Show smooth skeleton feed while loading initial Firestore messages.
     - `app/profile/page.tsx`: Replace center spinner with `<ProfileSkeleton />`.

4. **UI Motion & Micro-Interactions**:
   - Refine `.btn-primary` and `.btn-secondary` in `globals.css` with smooth micro-transforms (`active:scale-[0.98]`, subtle shimmer highlights).
   - Ensure all keyframe animations (`fade-in-up`, `typing-dot`, `pulse-glow`) have reduced-motion alternatives for accessibility (`@media (prefers-reduced-motion: reduce)`).

---

## Tasks Breakdown

### Phase 1: Foundation — Core Loaders & Skeletons

#### Task 1: Enhance `LoadingSpinner` with Size, Tone, and Button Variant
- **Description**: Extend `LoadingSpinner` to support flexible sizes (`xs`, `sm`, `md`, `lg`), color tones (`accent`, `white`, `danger`, `muted`), and a dedicated lightweight `button` or `ButtonSpinner` helper export.
- **Acceptance Criteria**:
  - `LoadingSpinner` accepts `size`, `tone`, and `className` props with safe defaults.
  - Export a convenient `<ButtonSpinner />` sub-component or helper for clean insertion into `<button>` elements.
  - Works seamlessly with dark theme glassmorphism.
- **Verification**: `npx tsc --noEmit` succeeds; vitest unit test verifies rendering and class application.
- **Files**: `apps/web/src/components/LoadingSpinner.tsx`, `apps/web/src/components/LoadingSpinner.test.ts`
- **Scope**: S (2 files)

#### Task 2: Extend `Skeleton` with Domain Layout Presets
- **Description**: Add domain skeleton presets to `Skeleton.tsx` for cards, feed items, message streams, profile views, and data tables.
- **Acceptance Criteria**:
  - Export `ConfessionCardSkeleton`, `ChatMessageSkeleton`, `GroupCardSkeleton`, `ProfileSkeleton`, `TableSkeleton`.
  - Maintain shimmer motion with smooth CSS animation and fallback for reduced-motion.
- **Verification**: `npx tsc --noEmit` succeeds; test file asserts component exports and structure.
- **Files**: `apps/web/src/components/Skeleton.tsx`, `apps/web/src/components/Skeleton.test.ts`
- **Scope**: S (2 files)

---

### Checkpoint: Foundation
- [ ] Component unit tests pass
- [ ] TypeScript check clean (`npx tsc --noEmit`)

---

### Phase 2: User-Facing Pages — Skeletons & Layout Stability

#### Task 3: Upgrade Confessions & Groups Page Loading
- **Description**: Replace the ad-hoc `animate-pulse` divs in `confessions/page.tsx` with `ConfessionCardSkeleton` and replace the full-page spinner in `groups/page.tsx` with `GroupCardSkeleton` grid.
- **Acceptance Criteria**:
  - No layout shift or full-page blanking while fetching confessions or groups.
  - Skeletons match exact card dimensions and padding.
- **Verification**: Page loads without React warning; `npm run build` succeeds.
- **Files**: `apps/web/src/app/confessions/page.tsx`, `apps/web/src/app/groups/page.tsx`
- **Scope**: S (2 files)

#### Task 4: Upgrade Chat & Message Streams Loading
- **Description**: Introduce `ChatMessageSkeleton` in `messages/[chatId]/page.tsx`, `public-chat/page.tsx`, and `anonymous-chat/page.tsx` so users see realistic chat message placeholders on initial connect.
- **Acceptance Criteria**:
  - `messages/[chatId]/page.tsx` displays message skeleton bubbles instead of a single spinning circle while fetching message history.
  - `public-chat/page.tsx` and `anonymous-chat/page.tsx` display chat skeletons during connecting/initial load.
- **Verification**: `npx tsc --noEmit` and `npm run build` clean.
- **Files**: `apps/web/src/app/messages/[chatId]/page.tsx`, `apps/web/src/app/public-chat/page.tsx`, `apps/web/src/app/anonymous-chat/page.tsx`
- **Scope**: M (3 files)

#### Task 5: Upgrade Profile & Settings Initial States
- **Description**: Replace full-screen loading spinners in `app/profile/page.tsx` and `app/settings/page.tsx` with layout-matching skeletons (`ProfileSkeleton`, `SettingsSkeleton`).
- **Acceptance Criteria**:
  - Visiting `/profile` or `/settings` immediately renders structural skeletons instead of a center spinner, eliminating layout flash upon profile hydration.
- **Verification**: `npx tsc --noEmit` clean.
- **Files**: `apps/web/src/app/profile/page.tsx`, `apps/web/src/app/settings/page.tsx`
- **Scope**: S (2 files)

---

### Checkpoint: User-Facing Pages
- [ ] All user pages compile and build cleanly
- [ ] No layout shift on page transitions

---

### Phase 3: Unification of Spinners & Button Loading States

#### Task 6: Standardize Button & Sub-Panel Spinners in Settings & Profile Edit
- **Description**: Replace raw `animate-spin` divs in `app/settings/page.tsx` (login logs, delete session, password reset, avatar upload) and `app/profile/edit/page.tsx` with standardized `ButtonSpinner` and `LoadingSpinner variant="inline"`.
- **Acceptance Criteria**:
  - Zero raw `border-t animate-spin` divs remaining in `settings/page.tsx` and `profile/edit/page.tsx`.
  - Buttons keep their width/height when entering loading state without text jitter.
- **Verification**: `grep -rn "animate-spin" apps/web/src/app/settings` and `profile/edit` verify standard component usage.
- **Files**: `apps/web/src/app/settings/page.tsx`, `apps/web/src/app/profile/edit/page.tsx`
- **Scope**: S (2 files)

#### Task 7: Standardize Admin Dashboard Loaders & Tables
- **Description**: Replace all raw `animate-spin` divs across `app/admin/**` (users, analytics, content, reports, announcements, confessions, anonymous-chat, settings, moderation-rules) with `<LoadingSpinner variant="inline" />`, `<ButtonSpinner />`, or `<TableSkeleton />`.
- **Acceptance Criteria**:
  - All admin tables display clean `<TableSkeleton />` or inline branded spinners during data fetching.
  - All admin action buttons (save, delete, refresh) use unified button spinners.
- **Verification**: `grep -rn "animate-spin" apps/web/src/app/admin` shows only standard components or Lucide icons.
- **Files**: `apps/web/src/app/admin/users/page.tsx`, `apps/web/src/app/admin/analytics/page.tsx`, `apps/web/src/app/admin/content/page.tsx`, `apps/web/src/app/admin/reports/page.tsx`, `apps/web/src/app/admin/announcements/page.tsx`, `apps/web/src/app/admin/confessions/page.tsx`, `apps/web/src/app/admin/anonymous-chat/page.tsx`, `apps/web/src/app/admin/moderation-rules/page.tsx`, `apps/web/src/app/admin/settings/page.tsx`
- **Scope**: L (9 files, highly repetitive and safe substitution)

#### Task 8: Standardize Popups, Search & Auth Page Loaders
- **Description**: Replace raw spinners in `components/ProfilePopup.tsx`, `components/GlobalSearch.tsx`, `app/login/page.tsx`, and `app/verify-email/page.tsx` with standard `ButtonSpinner` and `LoadingSpinner`.
- **Acceptance Criteria**:
  - Consistent loader aesthetics across search, profile popup, and authentication screens.
- **Verification**: `npx tsc --noEmit` and `npm run check` clean.
- **Files**: `apps/web/src/components/ProfilePopup.tsx`, `apps/web/src/components/GlobalSearch.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/verify-email/page.tsx`
- **Scope**: S (4 files)

---

### Phase 4: UI Motion, Transitions & Micro-Interactions

#### Task 9: Polish CSS Transitions & Reduced-Motion Accessibility
- **Description**: Refine button transitions, glass-panel hover states, and keyframe animations in `globals.css` with hardware-accelerated transforms and `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Acceptance Criteria**:
  - `.btn-primary` and `.btn-secondary` feature smooth active press down (`scale(0.98)`).
  - All animations respect user's reduced-motion preference without breaking layout.
- **Verification**: CSS builds cleanly without errors.
- **Files**: `apps/web/src/app/globals.css`
- **Scope**: XS (1 file)

---

### Checkpoint: Complete Verification
- [ ] ESLint zero errors (`npx eslint --quiet`)
- [ ] TypeScript zero errors (`npx tsc --noEmit`)
- [ ] Vitest test suite passes (`npm test`)
- [ ] Production build succeeds (`npm run build`)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Layout shifts when button text is replaced by spinner | Low | Use `ButtonSpinner` with flex alignment and fixed or minimum dimensions to preserve button size. |
| Virtualized list (`react-virtuoso`) skeleton mismatch | Medium | Skeleton sits outside `Virtuoso` and is conditionally displayed when `loading === true`, keeping `Virtuoso` unmounted or hidden until data is ready. |
| CSS animation overhead on lower-end mobile devices | Low | Shimmer and pulse effects use CSS transforms and opacity; reduced motion query disables heavy loops. |
