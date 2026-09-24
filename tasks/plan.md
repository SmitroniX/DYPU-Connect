# Implementation Plan: Comprehensive Rework — Themes, Accent Colors, Settings, Public Texting Bar & Profile Section

## Overview
This initiative addresses key UX pain points across the DYPU-Connect platform:
1. **Light & Dark Mode Fix**: Fix broken theme switching caused by Tailwind v4 media-query default by introducing class-based `@custom-variant dark` and eliminating hardcoded dark-only utility classes.
2. **Custom UI Accent Color Engine**: Empower users to choose custom accent colors (Indigo, Violet, Emerald, Cyan, Rose, Amber, or custom hex) in Settings that dynamically update CSS tokens and persist across sessions.
3. **Settings Page Rework**: Modernize `settings/page.tsx` into categorized, accessible sections (Appearance & Theme, Account, Notifications, Privacy & Blocked Users, Security & Devices, and Cookies/Data).
4. **Public & Mass Texting Bar Rework**: Polish `ChatInput.tsx` and public campus chat (`public-chat` and `anonymous-chat`) for crisp contrast in light/dark modes, dynamic accent styling, audio/attachment previews, and seamless mobile interactions.
5. **Profile Section Rework**: Upgrade `profile/page.tsx`, `profile/edit/page.tsx`, and `ProfilePopup.tsx` with dynamic accent banners, interactive completion meter, academic credentials, and responsive layouts.

---

## Architecture Decisions
- **Tailwind v4 Dark Mode Variant**: Add `@custom-variant dark (&:where(.dark, .dark *));` in `apps/web/src/app/globals.css` so `dark:...` classes respond reliably to `next-themes` toggling the `.dark` class on `html`.
- **Dynamic Accent Color Token System**:
  - Store selected color in `localStorage` (`dypu_accent_color`) and sync to Firestore user profile when authenticated.
  - Implement a theme helper `apps/web/src/lib/theme.ts` with color presets, contrast calculation, and CSS variable injection (`--ui-accent`, `--ui-accent-hover`, `--ui-accent-dim`, `--ui-accent-text`).
  - Wire into `ThemeProvider.tsx` and `SystemProvider.tsx` so the theme loads instantly with zero flash.
- **Unified Contrast Principles**:
  - Replace hardcoded `text-white/20`, `bg-black/40`, and similar values with semantic tokens (`text-[var(--ui-text-muted)]`, `bg-[var(--ui-bg-surface)]`, `bg-[var(--ui-bg-elevated)]`).
  - Ensure all accent-colored buttons use `text-[var(--ui-accent-text)]` so text remains readable regardless of light or dark background.

---

## Subagents Required: 4 Specialized Agents

| Subagent | Role | Scope / Files Touched |
|---|---|---|
| **Agent 1** | **Theme & Accent Color Engine Specialist** | `globals.css`, `lib/theme.ts`, `ThemeProvider.tsx`, `ThemeToggle.tsx` |
| **Agent 2** | **Settings & Appearance Rehaul Specialist** | `settings/page.tsx`, `components/AccentColorPicker.tsx` |
| **Agent 3** | **Public & Mass Texting Bar Specialist** | `ChatInput.tsx`, `ChatInput/*`, `public-chat/page.tsx`, `anonymous-chat/page.tsx` |
| **Agent 4** | **Profile Section & Edit Specialist** | `profile/page.tsx`, `profile/edit/page.tsx`, `ProfilePopup.tsx` |

---

## Task Breakdown

### Phase 1: Foundation — Theme Engine & Accent Color System (Agent 1)
- [ ] Task 1.1: Fix Tailwind v4 `@custom-variant dark` and clean light/dark mode CSS tokens in `globals.css`.
- [ ] Task 1.2: Implement `apps/web/src/lib/theme.ts` with accent color presets, dynamic CSS variable application, and storage sync.
- [ ] Task 1.3: Update `ThemeProvider.tsx` and `ThemeToggle.tsx` to handle accent color mounting and smooth transitions.
- [ ] Checkpoint 1: Theme Engine (TypeScript clean, zero theme flash, dark/light toggle switches classes properly).

### Phase 2: Settings & Appearance Rehaul (Agent 2)
- [ ] Task 2.1: Build `AccentColorPicker.tsx` component with preset swatches, active checkmarks, and custom hex input.
- [ ] Task 2.2: Rework `apps/web/src/app/settings/page.tsx` with a dedicated "Appearance & Theme" tab/section.
- [ ] Task 2.3: Reorganize Account, Privacy (Blocked users), Notifications, and Security settings with clean UI cards.
- [ ] Checkpoint 2: Settings Rehaul (Users can toggle Light/Dark/System and pick custom UI accent colors that apply live).

### Phase 3: Public & Mass Texting Bar Rework (Agent 3)
- [ ] Task 3.1: Fix light/dark mode styling in `ChatInput.tsx`, `MarkdownToolbar.tsx`, `SendButton.tsx`, and `AttachmentPreview.tsx`.
- [ ] Task 3.2: Enhance public chat (`public-chat/page.tsx`) and anonymous chat (`anonymous-chat/page.tsx`) texting bar with dynamic accent glows, 48-hour indicator pill, and responsive touch controls.
- [ ] Checkpoint 3: Texting Bar (Full functionality in light and dark modes, zero clipping, smooth send and media attachments).

### Phase 4: Profile Section Rework (Agent 4)
- [ ] Task 4.1: Modernize `apps/web/src/app/profile/page.tsx` with dynamic accent header, profile completion gauge, academic credentials, and social links.
- [ ] Task 4.2: Upgrade `apps/web/src/app/profile/edit/page.tsx` with responsive sticky actions, instant avatar preview, and department selectors.
- [ ] Task 4.3: Polish `components/ProfilePopup.tsx` for high-contrast light and dark mode display.
- [ ] Checkpoint 4: Profile Section (Flawless responsiveness, high-contrast light/dark mode, smooth editing flow).

### Phase 5: Verification & Synthesis
- [ ] Task 5.1: Run `npx tsc --noEmit` and `npm test`.
- [ ] Task 5.2: Verify responsive scaling, color persistency, and commit & push changes.

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Flash of Unstyled Color (FOUC) | Low | Inject stored accent color before paint via script or inline style in `ThemeProvider` |
| Contrast failure on custom colors | Medium | Pre-calculate luminance in `lib/theme.ts` to set `--ui-accent-text` to either `#FFFFFF` or `#09090B` |
| Firestore permission on theme sync | Low | Gracefully fallback to `localStorage` if unauthenticated or network is offline |
