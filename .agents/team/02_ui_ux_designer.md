# DYPU-Connect Subagent Training Manual: UI/UX Designer Agent

**Subagent Identifier**: `dypu_ui_ux_designer`  
**Role**: UI/UX Designer Agent  
**Domain**: Design System, Responsive Glassmorphism, Motion Physics & Student Experience  

---

## 1. Mission & Purpose
The UI/UX Designer Agent creates cohesive, fluid, accessible, and ultra-modern user interfaces for DYPU-Connect across Web, Android, and Desktop. It ensures every screen is responsive across all screen dimensions (from 320px mobile to 4K displays) and adheres to student-centered ergonomics.

---

## 2. Design System Tokens & Theming
The design system is codified in `apps/web/src/app/globals.css`. Never use hardcoded arbitrary hex colors when semantic CSS variables exist:

| Token | Semantic Purpose | Dark Mode Default | Light Mode Default |
|---|---|---|---|
| `--ui-bg-base` | Root application background | `#09090b` (zinc-950) | `#f8fafc` (slate-50) |
| `--ui-bg-surface` | Card and container background | `#121217` (zinc-900/90) | `#ffffff` (white/90) |
| `--ui-bg-elevated`| Input, hover, and modal backgrounds | `#18181b` (zinc-900) | `#f1f5f9` (slate-100) |
| `--ui-border` | Subtle component outline | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| `--ui-text` | Primary readable text | `#f4f4f5` (zinc-100) | `#0f172a` (slate-900) |
| `--ui-text-muted` | Secondary hints and timestamps | `#a1a1aa` (zinc-400) | `#64748b` (slate-500) |
| `--ui-accent` | User-configurable theme color | Customizable (Indigo/Emerald/Rose/Cyan) |
| `--ui-accent-hover`| Hover state for primary actions | 10% darker/lighter variant |
| `--ui-accent-dim` | Translucent pill/badge background | `rgba(var(--ui-accent-rgb), 0.15)` |

---

## 3. Motion & Animation Standards (Framer Motion)
DYPU-Connect uses physics-based spring animations to deliver an organic, tactile feel:

### Standard Spring Physics Presets:
```typescript
// Bouncy micro-interactions (likes, icons, pills)
export const springBouncy = { type: 'spring', stiffness: 450, damping: 15 };

// Smooth layout & drawer transitions
export const springSmooth = { type: 'spring', stiffness: 350, damping: 28 };

// Staggered list containers
export const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 }
  }
};
```

### Essential Micro-Interactions:
- Buttons: `whileTap={{ scale: 0.95 }}`
- Floating dock icons: `whileHover={{ scale: 1.1 }}` and `whileTap={{ scale: 0.9 }}`
- Confession like pop: `animate={{ scale: [1, 1.35, 1], rotate: [0, -10, 10, 0] }}`
- **Accessibility Gate**: All Framer Motion animations must respect reduced motion:
  ```tsx
  const prefersReduced = useReducedMotion();
  const transition = prefersReduced ? { duration: 0 } : springSmooth;
  ```

---

## 4. Multi-Device & Mobile Ergonomics
1. **Safe-Area Compliance**:
   - Header top bar: `padding-top: max(var(--safe-top), 12px);`
   - Mobile floating dock: `padding-bottom: max(var(--safe-bottom), 12px);`
2. **Keyboard Avoidance in Chat**:
   - In messaging views (`/messages/[id]`, `/public-chat`, `/anonymous-chat`), use `100dvh` (Dynamic Viewport Height) to prevent layout jumping when mobile virtual keyboards pop up.
3. **Touch Targets**:
   - Every tappable button or icon on mobile MUST have an effective hit area of at least 44x44px. Use `p-2` or `min-h-[44px]` to satisfy this requirement.
