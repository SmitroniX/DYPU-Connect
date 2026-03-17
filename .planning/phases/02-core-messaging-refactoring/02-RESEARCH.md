# Phase 2: Core Messaging Refactoring - Research

**Researched:** 2026-03-16
**Domain:** Real-time Messaging & UI Optimization
**Confidence:** HIGH

## Summary
The current messaging system relies heavily on Firestore `onSnapshot` listeners across three distinct implementations: Private Chats, Public Chat (Campus Plaza), and Group Chats. While functional, this approach lacks strict type safety at the database level and suffers from performance bottlenecks as message history grows. Transitioning to Firebase Data Connect (FDC) will provide PostgreSQL-backed type safety, while `useOptimistic` and virtualization will significantly improve the user experience.

**Primary recommendation:** Standardize on a unified message hook that abstracts the data source (Firestore vs FDC) and integrates `useOptimistic` for immediate UI feedback.

## Architecture Patterns

### Real-time Migration
Current `onSnapshot` listeners in `PrivateChatDetail`, `PublicChatPage`, and `GroupChatDetail` should be replaced by FDC React hooks (e.g., `useListMessages`).
*Note:* As of current documentation, FDC real-time behavior in the React SDK often utilizes TanStack Query's polling or invalidation patterns rather than WebSocket-based "subscriptions" for PostgreSQL, though the SDK automates the re-fetching.

### Optimistic UI with `useOptimistic`
Instead of waiting for `addDoc` or FDC mutations to resolve, `useOptimistic` should be used to append the message to the local state immediately with a "sending" status.

## Don't Hand-Roll
| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| List Virtualization | Custom scroll logic | `react-virtuoso` | Handles dynamic heights and "sticky to bottom" behavior natively. |
| Input Sanitization | Custom regex | `dompurify` / existing `sanitiseInput` | Security risks with hand-rolled filters. |

## Common Pitfalls
1. **Poll Overload:** Setting `refetchInterval` too low in FDC can overwhelm the database.
2. **Virtualization Jump:** Implementing virtualization in chat without handling "scroll to bottom" correctly leads to jitter.
3. **Data Mismatch:** Firestore IDs are strings, while FDC/PostgreSQL IDs might be UUIDs or Ints. Mapping logic is required during the transition.

## Code Examples (Conceptual)
```typescript
// Optimistic Message Update
const [optimisticMessages, addOptimisticMessage] = useOptimistic(
  messages,
  (state, newMessage) => [...state, { ...newMessage, sending: true }]
);
```

## Open Questions
1. **FDC Subscription Maturity:** Does the current FDC React SDK support true PostgreSQL NOTIFY-based subscriptions, or is it strictly polling-based?
2. **Schema Alignment:** The current `DirectMessage` table in `schema.gql` uses `Student` relations, whereas Firestore uses UIDs. Foreign key constraints must be populated.
