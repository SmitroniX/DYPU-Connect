# Task List: Theme Fixes, Accent Colors, Settings, Public Texting Bar & Profile Rework

### Phase 1: Theme Engine & Accent Color System (Agent 1)
- [x] Task 1.1: Fix Tailwind v4 `@custom-variant dark` & refresh light/dark tokens (`apps/web/src/app/globals.css`)
- [x] Task 1.2: Implement Accent Color Manager & Presets (`apps/web/src/lib/theme.ts`)
- [x] Task 1.3: Wire Accent Color provider into `ThemeProvider.tsx` & enhance `ThemeToggle.tsx`
- [x] Checkpoint 1: Theme Engine (TypeScript compiles, dark & light mode toggles cleanly, accent color applies dynamically)

### Phase 2: Settings & Appearance Rehaul (Agent 2)
- [x] Task 2.1: Create interactive `AccentColorPicker` component (`apps/web/src/components/AccentColorPicker.tsx`)
- [x] Task 2.2: Add Appearance & Theme section with Live Color Swatches in `settings/page.tsx`
- [x] Task 2.3: Reorganize Settings sections (Account with Edit Profile shortcut, Privacy/Blocked Users, Notifications, Security) with clean UI cards
- [x] Checkpoint 2: Settings Rehaul (Appearance controls working, accent color changes persist)

### Phase 3: Public & Mass Texting Bar Rework (Agent 3)
- [x] Task 3.1: Fix light/dark mode contrast in `ChatInput.tsx`, `MarkdownToolbar.tsx`, `AttachmentPreview.tsx`, and `SendButton.tsx`
- [x] Task 3.2: Enhance public chat (`public-chat/page.tsx`) & anonymous chat (`anonymous-chat/page.tsx`) texting bar
- [x] Checkpoint 3: Texting Bar (Full functionality in light and dark modes, dynamic accent color matching)

### Phase 4: Profile Section Rework (Agent 4)
- [x] Task 4.1: Modernize `apps/web/src/app/profile/page.tsx` with dynamic accent header & completion meter
- [x] Task 4.2: Upgrade `apps/web/src/app/profile/edit/page.tsx` with responsive sticky actions & department pickers
- [x] Task 4.3: Polish `components/ProfilePopup.tsx` for light/dark contrast
- [x] Checkpoint 4: Profile Section (Flawless responsiveness, high-contrast light/dark mode)

### Phase 5: Verification & Review
- [x] Task 5.1: Run `npx tsc --noEmit` and `npm test` across all suites
- [ ] Task 5.2: Stage, commit, and push changes with zero errors
