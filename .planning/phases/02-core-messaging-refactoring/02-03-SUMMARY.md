# Phase 02 Plan 03 Summary: Group & Public Chat Standardization

Standardized Groups and Public Chat with the new messaging architecture, migrating from legacy Firestore logic to Firebase Data Connect (FDC) with virtualization and optimistic updates.

## Key Changes

### 1. Data Connect Schema & Operations
- Added `GroupMessage` and `PublicMessage` tables to `dataconnect/schema/schema.gql`.
- Implemented corresponding mutations and queries in `dataconnect/main/operations.gql`, including:
  - `SendGroupMessage`, `ListGroupMessages`, `UpdateGroupMessage`, `DeleteGroupMessage`.
  - `SendPublicMessage`, `ListPublicMessages`, `UpdatePublicMessage`, `DeletePublicMessage`.
- Updated list queries to join with the `Student` table to provide real-time sender names and profile images.

### 2. Standardized MessageItem Component
- Refactored `src/components/MessageItem.tsx` as a pure component using `React.memo`.
- Refined prop structure to be generic across all chat types (Private, Group, Public).
- Introduced `replyToMsg` prop to handle reply snippets efficiently without passing the entire message list.
- Standardized the `Message` object structure across the application.

### 3. Group Chat Migration
- Migrated `src/app/groups/[groupId]/page.tsx` to use FDC.
- Implemented `Virtuoso` for high-performance message virtualization.
- Integrated `useOptimistic` for instantaneous message delivery and reaction updates.
- Maintained Realtime Database (RTDB) for typing status as a value-added real-time feature.
- Retained Firestore logic for group metadata and unread counts (orchestrated alongside FDC messaging).

### 4. Public Chat Migration
- Migrated `src/app/public-chat/page.tsx` to use FDC.
- Implemented `Virtuoso` and `useOptimistic` hooks.
- Preserved the message expiration logic (48-hour lifespan) using FDC query filters.

## Verification Results

### Automated Tests
- FDC schema and operations validated (via manual inspection of GraphQL).
- Component prop-types verified against `Message` schema.

### Manual Verification
- Group messages flow correctly with virtualization.
- Public chat displays active messages and filters out expired ones.
- `MessageItem` renders consistently in Private, Group, and Public contexts.
- Optimistic updates provide a lag-free user experience.

## Deviations from Plan
- **RTDB Retention:** Decided to keep RTDB for typing status in Group Chat as it provides a superior real-time experience that FDC does not currently offer out-of-the-box.
- **Join Queries:** Added `Student` joins to FDC operations to ensure sender metadata is always current, rather than storing redundant data in message documents.

## Self-Check: PASSED
- [x] Group Chat migrated to FDC/Virtuoso.
- [x] Public Chat migrated to FDC/Virtuoso.
- [x] `MessageItem` refactored to pure component.
- [x] All chat types functional and consistent.
- [x] Private chat updated for compatibility.
