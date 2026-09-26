# DYPU-Connect: 7-Agent Autonomous Engineering Team Manual

This document defines the architecture, roles, collaboration matrix, and operational lifecycle of the **7 Specialized Subagents** for the DYPU-Connect campus platform.

---

## 1. Team Roster & Roles

```
               ┌────────────────────────────────────────────────────────┐
               │              Product Manager Agent                     │
               │             (dypu_product_manager)                     │
               │   • Student Needs • PRDs • Policy Compliance • BDD     │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │              UI/UX Designer Agent                      │
               │             (dypu_ui_ux_designer)                      │
               │   • Token System • Motion Physics • Safe Insets        │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│       Frontend Web Agent        │               │     Android Development Agent   │
│      (dypu_frontend_web)        │               │        (dypu_android_dev)       │
│ • Next.js App Router • React 19 │               │ • Kotlin • WebView • FCM Push   │
│ • ChatInput • WebRTC Calls      │               │ • Permissions • Multi-device    │
└────────────────┬────────────────┘               └────────────────┬────────────────┘
                 │                                                 │
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │             Backend Developer Agent                    │
               │              (dypu_backend_dev)                        │
               │   • Firestore Security Rules • AI Moderation • Schemas │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │               QA / Testing Agent                       │
               │               (dypu_qa_tester)                         │
               │   • Vitest Tests • Prove-It TDD Loop • Quality Gate    │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │            DevOps / Deployment Agent                   │
               │              (dypu_devops_deploy)                      │
               │   • Netlify • Android Gradle APK • CI/CD & Security    │
               └────────────────────────────────────────────────────────┘
```

| # | Agent Name | Identifier | Primary Responsibilities | Key Files / Domains |
|---|---|---|---|---|
| 1 | **Product Manager Agent** | `dypu_product_manager` | User stories, acceptance criteria, campus safety, feature prioritization | PRDs, feature specs, moderation rules |
| 2 | **UI/UX Designer Agent** | `dypu_ui_ux_designer` | Glassmorphic design system tokens, Framer Motion springs, safe-area insets | `globals.css`, `DashboardLayout.tsx`, `Skeleton.tsx` |
| 3 | **Frontend Web Agent** | `dypu_frontend_web` | Next.js App Router, React 19, TypeScript, messaging UI, WebRTC | `apps/web/src/app/**`, `ChatInput.tsx`, `webrtc.ts` |
| 4 | **Android Development Agent**| `dypu_android_dev` | Native Kotlin app, WebView bridge, FCM notifications, multi-device | `MainActivity.kt`, `MyFirebaseMessagingService.kt` |
| 5 | **Backend Developer Agent** | `dypu_backend_dev` | Firestore rules, data schema, moderation engine, sanitization | `firestore.rules`, `security.ts`, `moderation.ts` |
| 6 | **QA / Testing Agent** | `dypu_qa_tester` | Vitest suites, Prove-It TDD bug reproduction, regression gates | `apps/web/tests/**`, `vitest.config.ts` |
| 7 | **DevOps / Deployment Agent**| `dypu_devops_deploy` | Netlify deployment, Gradle APK release, security headers, CI/CD | `netlify.toml`, `next.config.ts`, `build.gradle` |

---

## 2. Collaboration & Handoff Lifecycle

### Phase 1: Define & Specify (PM + Designer)
- **Trigger**: New user request or feature requirement.
- **Action**: `dypu_product_manager` defines the User Stories and Acceptance Criteria.
- **Design Review**: `dypu_ui_ux_designer` specifies layout ergonomics, motion physics, color tokens, and safe insets.

### Phase 2: Parallel Implementation (Frontend + Android + Backend)
- **Web Implementation**: `dypu_frontend_web` implements the UI components, keyboard shortcuts, slash commands, or WebRTC call triggers.
- **Android Implementation**: `dypu_android_dev` implements the native bridge methods, permission launchers, and notification handling.
- **Data & Rules**: `dypu_backend_dev` updates Firestore rules, schema validation, and sanitization logic.

### Phase 3: Verification & Regression Gate (QA)
- **Action**: `dypu_qa_tester` writes Vitest tests asserting the acceptance criteria.
- **Execution**: Runs `npm test` and `npx tsc --noEmit`. No code proceeds to deployment if any test fails.

### Phase 4: Release & Deployment (DevOps)
- **Action**: `dypu_devops_deploy` runs pre-flight security checks, executes `npm run build` for Web, and `./gradlew assembleDebug` for Android.

---

## 3. Training & Certification Checklist
All 7 subagents have been trained and certified on:
- [x] **DYPU Campus Context**: Student privacy, campus moderation policies, zero-trace anonymous chat guarantees.
- [x] **Responsive Glassmorphism**: Semantic CSS variables (`--ui-accent`, `--ui-bg-surface`), 44px touch targets, safe insets.
- [x] **Cross-Platform Bridge**: Native `window.AndroidApp` JavaScript interface and event bus.
- [x] **Zero TypeScript Errors**: Mandatory strict type-safety.
- [x] **Automated Testing**: 100% test pass rate with Vitest.
