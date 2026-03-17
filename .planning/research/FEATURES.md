# Feature Landscape: Real-time Chat (2025)

**Domain:** Communication Platforms
**Researched:** May 2025

## Table Stakes

Features users expect in any modern chat application.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time Messaging | Core function of chat. | Medium | Use Data Connect Subscriptions for sync. |
| Read Receipts | Status transparency. | Low | Simple relational status update. |
| Media Sharing (Images/Video) | Fundamental to communication. | High | Requires storage optimization & resizing. |
| Anonymous Mode | Core request for privacy-first apps. | Medium | Firebase Anonymous Auth + Identity Platform. |
| Push Notifications | Critical for engagement. | Medium | Firebase Cloud Messaging (FCM). |
| Typing Indicators | Immediacy and presence. | Low | Temporary ephemeral state in Firestore/RTDB. |

## Differentiators

Features that set this product apart in the 2025 ecosystem.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| E2EE Anonymous Chat | Full privacy without sacrificing usability. | High | Use Web Crypto API for client-side encryption. |
| AI Message Summarization | Catch up on long group chats quickly. | High | Firebase Extensions + Gemini API. |
| Semantic Search | Search by meaning, not just keywords. | Medium | Data Connect + Vertex AI vector search. |
| Smart Suggestions | Context-aware quick replies. | Medium | On-device ML or Gemini Nano (browser-native). |
| Expiring Anonymous Accounts | Automatic privacy maintenance. | Low | Identity Platform clean-up features. |

## Anti-Features

Features to explicitly NOT build to maintain performance and privacy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Persistent PII for Anonymous | Defeats the purpose of anonymity. | Use temporary session tokens. |
| Server-side Message Logging | Security risk for E2EE apps. | Only log encrypted blobs, never plaintext. |
| Custom WebSocket Servers | High maintenance and hard to scale. | Use Firebase Data Connect Subscriptions. |

## Feature Dependencies

```
Auth (Anonymous) → Chat Creation → Message Sending → Media Attachment
E2EE Keys Generation → Message Encryption → Secure Message Sending
Data Connect Schema → Subscription SDK → Real-time UI updates
```

## MVP Recommendation

Prioritize:
1.  **Anonymous Auth + App Check** (Foundation)
2.  **Real-time Messaging (Text only)** using Data Connect.
3.  **Basic Image Sharing** with Resize extension.
4.  **Simple E2EE** (AES-GCM) for one-on-one anonymous chats.

Defer:
- **AI Features:** High complexity, can be added as Phase 2/3.
- **Semantic Search:** Requires stable Data Connect + Vertex AI setup.
- **Video Calling:** Use a third-party like Agora or Daily.co instead of building raw WebRTC.

## Sources

- [Firebase Blog 2025](https://firebase.blog) (HIGH)
- [Ecosystem Research - Google Search](MEDIUM)
