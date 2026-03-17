# Phase 1: Quality Foundation - Research

**Researched:** 2026-03-16
**Domain:** TypeScript, Code Quality, Architecture Debt
**Confidence:** HIGH

## Summary
The project has a solid technical foundation (Next.js, Firebase, Strict TypeScript) but suffers from high "lint noise" and minor architectural coupling. There are 57 lint issues and 2 TypeScript errors currently blocking clean CI/CD. The use of `any` is restricted to specific Firebase timestamp handling, but type safety can be improved in data models.

**Primary recommendation:** Resolve the 57 lint issues and 2 TSC errors immediately to establish a "zero-warning" baseline before proceeding with new features.

## User Constraints
*No CONTEXT.md found. Using project defaults.*

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Eliminate 'any' usage | Found 1 explicit `: any` in `MessageItem.tsx` (timestamp). |
| QUAL-02 | Resolve Lint/TSC errors | Identified 57 lint problems and 2 TSC errors in `AuthProvider.tsx`. |
| QUAL-03 | Refactor `src/lib` | Identified coupling between `security.ts` and `deviceSessions.ts`. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | Web Framework | Modern SSR/App Router support. |
| TypeScript | ^5 | Language | Type safety (Strict mode enabled). |
| Firebase | 11.x | Backend | Real-time DB and Auth. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^3.23 | Validation | Use for all Data Connect/Firestore models. |
| ESLint | ^9 | Linting | Enforce code standards. |

## Architecture Patterns

### Current Structure
```
src/
├── app/             # Next.js App Router pages
├── components/      # React components
├── hooks/           # Custom React hooks (usePresence, useTypingStatus)
├── lib/             # Utility logic and services (Firebase, Security, etc.)
└── types/           # Global type definitions (profile, groups)
```

### Coupling Observations
- `src/lib/deviceSessions.ts` imports from `src/lib/security.ts`.
- `src/lib/cookieShield.ts` imports from `src/lib/security.ts`.
- `src/lib/firebase.ts` is the central hub for most services.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema Validation | Custom checks | Zod | Robust, type-inferred validation. |
| Time Formatting | Native Date manipulation | date-fns | Existing project dependency; handles edge cases. |

## Common Pitfalls

### Pitfall 1: Unused Exports and Variables
**What goes wrong:** 49/57 lint issues are unused variables/imports.
**How to avoid:** Enable `noUnusedLocals` and `noUnusedParameters` in `tsconfig.json` after the initial cleanup.

### Pitfall 2: 'any' in Data Models
**What goes wrong:** `timestamp: any` in `Message` interface leads to runtime crashes when calling `.toDate()`.
**How to avoid:** Use `Timestamp` type from `firebase/firestore`.

## Code Examples

### Fixed Message Type
```typescript
import { Timestamp } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    timestamp: Timestamp; // Replaces 'any'
}
```

## Open Questions
1. **Zod Coverage:** How much of the existing Firestore data is actually validated at the boundary? (Initial grep suggests low Zod usage in `src/lib`).
2. **Toast Library:** `AuthProvider.tsx` references `toast` which is missing an import. Which toast library is intended (e.g., `react-hot-toast`, `sonner`)?

## Validation Architecture
*Enabled per `.planning/config.json`*

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (Recommended) |
| Config file | To be created in Phase 1 |
| Quick run command | `npm test` |

### Wave 0 Gaps
- [ ] No existing test configuration found.
- [ ] `AuthProvider.tsx` needs a mock for Firebase Auth to test the fix.

## Sources
- `tsconfig.json` - Verified strict mode.
- `npm run lint` - 57 problems found.
- `npx tsc --noEmit` - 2 errors in `AuthProvider.tsx`.
