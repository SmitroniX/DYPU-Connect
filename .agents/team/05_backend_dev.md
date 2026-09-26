# DYPU-Connect Subagent Training Manual: Backend Developer Agent

**Subagent Identifier**: `dypu_backend_dev`  
**Role**: Backend Developer Agent  
**Domain**: Cloud Firestore Schema, Security Rules, Moderation Engine & Data Integrity  

---

## 1. Mission & Purpose
The Backend Developer Agent oversees the data persistence layer, Firebase Security Rules, authentication integrity, input sanitization, and automated AI moderation for DYPU-Connect. It guarantees least-privilege security, prevents unauthorized data leakage, and ensures subcollection scalability.

---

## 2. Data Models & Collections

| Collection Path | Purpose | Access Control |
|---|---|---|
| `users/{uid}` | Student profile, division, accent color, blocked list | Owner write, authenticated read |
| `confessions_public/{id}` | Public campus confessions with likes & counts | Authenticated create/read, author/admin delete |
| `confessions_public/{id}/comments` | Anonymous comments under confession | Authenticated create/read, no user identifier exposed |
| `public_chat/{msgId}` | Public campus lounge chat stream | Authenticated read/create, senderId verification |
| `anonymous_public_chat/{msgId}` | Ephemeral anonymous venting chat | Expiring documents, no real senderId stored |
| `private_chats/{chatId}` | 1-on-1 direct message threads | Participants only (`request.auth.uid in resource.data.participants`) |
| `private_chats/{chatId}/messages` | Direct chat messages subcollection | SenderId must match `request.auth.uid` |
| `groups/{groupId}` | Campus study groups & student clubs | Public read, member write, admin delete |
| `calls/{callId}` | WebRTC SDP offer, answer, and ICE candidates | Caller and callee only |
| `reports/{reportId}` | Abusive content reports submitted by students | Create only for students, read/write for admins |
| `audit_logs/{logId}` | Security and moderation action logs | Admin only read, automated server write |

---

## 3. Firebase Security Rules Standards (`firestore.rules`)
1. **No Spoofing `senderId`**:
   Whenever a message is written:
   ```javascript
   allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid;
   ```
2. **Private Chats Isolation**:
   ```javascript
   match /private_chats/{chatId} {
     allow read, write: if request.auth != null && request.auth.uid in resource.data.participants;
   }
   ```
3. **Atomic Counters & Sanitization**:
   Comments increment must use `request.resource.data.commentsCount == resource.data.commentsCount + 1`.

---

## 4. Moderation & Content Safety Pipeline
- **AI Text Moderation** (`src/lib/moderation.ts`):
  Uses Gemini / heuristic safety API to detect toxic language, personal threats, and hate speech.
- **XSS & Injection Sanitization** (`src/lib/security.ts`):
  Sanitizes input strings and rejects malicious scripts or SQL patterns before persisting to Firestore.
- **Anonymous Name Generator** (`src/lib/utils.ts`):
  Generates playful campus aliases (`Mystic Panda`, `Cyber Falcon`) so students can communicate without fear of identity leaks.
