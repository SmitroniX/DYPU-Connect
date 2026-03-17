# Validation: Phase 02 - Core Messaging Refactoring

**Phase:** 02
**Goal:** Migrate to Firebase Data Connect and optimize UI with virtualization and optimistic updates.

## Success Criteria

| ID | Criterion | Verification Method |
|----|-----------|--------------------|
| V2.1 | FDC Migration | Private/Group/Public chats load/send messages via FDC hooks. |
| V2.2 | Optimistic UI | New messages/reactions show instantly without visual delay. |
| V2.3 | Virtualization | `Virtuoso` active in all chat lists; smooth scrolling for 100+ items. |
| V2.4 | Scroll Persistence | New messages correctly trigger scroll-to-bottom. |
| V2.5 | Code Health | Zero regressions in `MessageItem` rendering or interaction logic. |

## Mandatory Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| PLAN-01 | `.planning/phases/02-core-messaging-refactoring/02-01-PLAN.md` | FDC Migration Plan. |
| PLAN-02 | `.planning/phases/02-core-messaging-refactoring/02-02-PLAN.md` | UX Optimization Plan. |
| PLAN-03 | `.planning/phases/02-core-messaging-refactoring/02-03-PLAN.md` | Scale & Standardization Plan. |
| SUMMARY-01 | `.planning/phases/02-core-messaging-refactoring/02-01-SUMMARY.md` | Wave 1 execution report. |
| SUMMARY-02 | `.planning/phases/02-core-messaging-refactoring/02-02-SUMMARY.md` | Wave 2 execution report. |
| SUMMARY-03 | `.planning/phases/02-core-messaging-refactoring/02-03-SUMMARY.md` | Wave 3 execution report. |

## Verification Protocol

1. **Pre-Execution:**
   - [x] Research completed (`02-RESEARCH.md`).
   - [x] Plans created (`02-01-PLAN.md`, `02-02-PLAN.md`, `02-03-PLAN.md`).
   - [x] Validation architecture ready (`02-VALIDATION.md`).

2. **Post-Execution:**
   - Manually test each chat type (Private, Group, Public).
   - Verify `react-virtuoso` presence in DevTools.
   - Run `npx tsc --noEmit` and `npm run lint`.
   - Verify mutation rollbacks on network failure (simulated).

## Approval Gates

- [ ] All Wave Summaries created.
- [ ] No regressions in legacy Firestore data access (if co-existing).
- [ ] Performance audit confirms improved FPS during scroll.
