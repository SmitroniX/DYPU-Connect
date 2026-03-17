# Phase 03: Design & Polish (UI/UX) - Research

**Researched:** 2025-05-15
**Domain:** UI/UX, Design Systems, Animation, Next.js 16
**Confidence:** HIGH

## Summary

This phase focuses on elevating the user experience of DYPU-Connect through design consistency, modern animations, and leveraging Next.js 16's latest UI features. The project already uses a solid foundation with Tailwind CSS 4 and a centralized design token system in `globals.css`. We will introduce Framer Motion for fluid transitions and optimize the app's loading performance using Partial Prerendering (PPR) and enhanced error boundaries.

**Primary recommendation:** Standardize all interactive surfaces using the established CSS variables and introduce Framer Motion `AnimatePresence` for layout transitions to make the application feel like a native mobile experience.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Framework | Current stable major version with PPR and Layout Deduplication. |
| Tailwind CSS | 4.0.0 | Styling | Modern, performance-first styling with native CSS variables. |
| Framer Motion | 12.37.0 | Animation | Industry standard for React animations and layout transitions. |
| Lucide React | 0.575.0 | Icons | Consistent, lightweight icon set. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx / tailwind-merge | latest | Class Management | Conditional classes and merging Tailwind utilities. |

**Installation:**
```bash
npm install framer-motion@12.37.0
```

## Architecture Patterns

### Recommended Design System Usage
The project uses Zinc-based neutral dark surfaces. All new components MUST use these variables:
- `var(--ui-bg-base)`: Main background.
- `var(--ui-bg-surface)`: Cards, sidebars, panels.
- `var(--ui-bg-hover)`: Interactive states.
- `var(--ui-accent)`: Primary brand color (Indigo-violet).

### Framer Motion Integration Strategy
1. **Layout Transitions:** Wrap `main` content in `DashboardLayout` with `motion.div` and `layout` prop for smooth route transitions.
2. **Component Feedback:** Use `whileHover={{ scale: 0.98 }}` and `whileTap={{ scale: 0.95 }}` for buttons and sidebar items.
3. **AnimatePresence:** Use for `NotificationPanel`, `GlobalSearch`, and mobile sidebar overlays to handle mount/unmount animations.

## Next.js 16 specific UI features

### Partial Prerendering (PPR)
Next.js 16 stabilizes PPR. We should enable it in `next.config.ts`:
```typescript
const nextConfig = {
  experimental: {
    ppr: true, // Enable Partial Prerendering
  },
};
```
**Impact:** `DashboardLayout`'s static parts (Sidebar, Header) will be served instantly, while dynamic components (Announcements, Notifications) will stream in via Suspense.

### Layout Deduplication
Next.js 16 optimizes navigation by not re-downloading shared layouts. This makes transitions between chat rooms or profile sections significantly faster.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/Overlay logic | Custom state | Radix UI or Framer Motion | Focus management, accessibility, and exit animations. |
| Complex Scroll Sync | Manual refs | `react-virtuoso` | Already in package.json; handles large lists efficiently. |
| Shimmer Effects | Custom CSS Keyframes | Skeleton Components | Ensure consistency in "loading" visual language. |

## Common Pitfalls

### Pitfall 1: Layout Shifts with PPR
**What goes wrong:** Enabling PPR without proper Suspense boundaries causes "jumping" UI when dynamic content streams in.
**How to avoid:** Every dynamic component (e.g., `AnnouncementBanner`) must be wrapped in a `<Suspense fallback={<Skeleton />}>`.

### Pitfall 2: Excessive Framer Motion Bundles
**What goes wrong:** Using `motion.div` for every tiny element increases JS bundle size.
**How to avoid:** Use CSS transitions for simple hover effects; reserve Framer Motion for complex layout changes and entrance/exit animations.

## Code Examples

### Standardized Error Boundary (src/app/error.tsx enhancement)
```typescript
// Use the 'digest' for reporting to a service like Sentry
'use client';
import { motion } from 'framer-motion';

export default function GlobalError({ error, reset }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full gap-4"
    >
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <button onClick={() => reset()} className="px-4 py-2 bg-[var(--ui-accent)] rounded-lg">
        Try Again
      </button>
    </motion.div>
  );
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Testing Library |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Consistent Sidebar styles | Smoke/Unit | `npm test src/components/Sidebar.test.tsx` | ❌ Wave 0 |
| UI-02 | Framer Motion animations | Integration | Manual/Storybook | N/A |
| UI-03 | PPR Loading States | Smoke | `npm run build` (check logs) | ✅ |

## Sources

### Primary (HIGH confidence)
- `package.json` - Verified Next.js 16.1.6 and Tailwind 4.
- `src/app/globals.css` - Verified design token system.
- `npm view` - Verified latest Framer Motion version.

### Secondary (MEDIUM confidence)
- Next.js 16 Official Release Notes - For PPR and Layout Deduplication details.

## Metadata
**Confidence:** HIGH - Environment is well-understood and modern.
**Research date:** 2025-05-15
**Valid until:** 2025-06-15 (30 days)
