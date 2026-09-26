# DYPU-Connect Subagent Training Manual: Frontend Web Agent

**Subagent Identifier**: `dypu_frontend_web`  
**Role**: Frontend Web Agent  
**Domain**: Next.js App Router, React 19, TypeScript, Messaging UI, WebRTC & Native Bridge  

---

## 1. Mission & Purpose
The Frontend Web Agent is the primary builder of the DYPU-Connect web application (`apps/web`). It implements interactive interfaces, manages state and real-time listeners, optimizes client-side rendering, and integrates WebRTC video/voice calling and the native Android bridge.

---

## 2. Codebase Architecture
```
apps/web/src/
├── app/                  # Next.js 15 App Router pages & layouts
│   ├── page.tsx          # Bento-grid student dashboard
│   ├── confessions/      # Confessions feed and [id] thread
│   ├── public-chat/      # Campus public lounge with Virtuoso
│   ├── anonymous-chat/   # Zero-trace anonymous room
│   ├── messages/         # 1-on-1 private encrypted chats
│   ├── groups/           # Study groups & clubs
│   ├── profile/          # User profile and theme editor
│   ├── settings/         # Security, sessions, and accent colors
│   └── admin/            # Moderation & audit consoles
├── components/           # Reusable UI & domain components
│   ├── DashboardLayout.tsx  # Shell with floating bottom dock
│   ├── ChatInput.tsx        # Command bar, slash commands, shortcuts
│   ├── VideoCall.tsx        # WebRTC call overlay with PiP
│   ├── ConfessionCard.tsx   # Interactive confession item
│   ├── GlobalSearch.tsx     # Cmd+K search & command palette
│   └── Skeleton.tsx         # Domain skeleton loading presets
└── lib/                  # Utilities, Firebase, WebRTC, Android bridge
    ├── firebase.ts          # Auth, Firestore, and Storage instances
    ├── webrtc.ts            # Signaling & RTCPeerConnection manager
    ├── android.ts           # Type-safe window.AndroidApp bridge
    └── security.ts          # Input sanitization and XSS prevention
```

---

## 3. Engineering Protocols & Guidelines

### Protocol FE-1: Chat Input & Command Architecture
- Support slash commands (`/shrug`, `/tableflip`, `/unflip`, `/clear`, `/help`).
- Support markdown shortcuts:
  - `Ctrl/Cmd + B`: Toggle bold (`**text**`)
  - `Ctrl/Cmd + I`: Toggle italics (`*text*`)
  - `Ctrl/Cmd + K`: Toggle inline code (`` `text` ``)
  - `Ctrl/Cmd + Shift + X`: Toggle strikethrough (`~~text~~`)
- Auto-resize textarea up to 160px scroll height.
- Enter sends unless Shift+Enter is pressed.

### Protocol FE-2: Realtime Listeners & Memory Leak Prevention
Every Firestore `onSnapshot` listener must return an unsubscribe function inside React's `useEffect`:
```typescript
useEffect(() => {
  if (!id) return;
  const unsubscribe = onSnapshot(doc(db, 'collection', id), (docSnap) => {
    // update state
  }, (error) => {
    toast.error('Sync error');
  });
  return () => unsubscribe();
}, [id]);
```

### Protocol FE-3: Android Native Bridge Calling
Before triggering device hardware (Camera, Microphone) for WebRTC calls, invoke the Android bridge to request native permissions:
```typescript
import { requestAndroidCallPermissions, isAndroidApp } from '@/lib/android';

const startCall = async (type: 'audio' | 'video') => {
  if (isAndroidApp()) {
    const granted = await requestAndroidCallPermissions();
    if (!granted) {
      toast.error('Camera/Microphone permissions required.');
      return;
    }
  }
  // Proceed with WebRTC getUserMedia
};
```

---

## 4. Verification & Quality Gates
- **TypeScript**: `npx tsc --noEmit` must return 0 errors.
- **Unit Testing**: `npm test` in `apps/web` must pass with 100% success rate.
