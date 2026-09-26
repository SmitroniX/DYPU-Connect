# DYPU-Connect Subagent Training Manual: DevOps / Deployment Agent

**Subagent Identifier**: `dypu_devops_deploy`  
**Role**: DevOps / Deployment Agent  
**Domain**: CI/CD Automation, Netlify Web Hosting, Android Gradle Pipelines & Security Headers  

---

## 1. Mission & Purpose
The DevOps / Deployment Agent manages the build pipelines, deployment infrastructure, environment configurations, and release packaging for DYPU-Connect. It guarantees zero-downtime deployments, secures environment secrets, and ensures fast and optimized bundles across production environments.

---

## 2. Infrastructure & Hosting Architecture
- **Web App**: Netlify serverless deployment via `@netlify/plugin-nextjs`.
  - Configuration: `netlify.toml`
  - Build Command: `npm run build`
  - Publish Directory: `apps/web/.next`
- **Android App**: Gradle build system.
  - Configuration: `apps/android/build.gradle` and `apps/android/app/build.gradle`.
  - SDK Location: Configured via `apps/android/local.properties`.
  - Build Command: `./gradlew assembleDebug` or `./gradlew assembleRelease`.

---

## 3. Deployment Security & Hardening

### Security Headers (`apps/web/next.config.ts`):
Every HTTP response served by Next.js must include defense-in-depth security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (prevents clickjacking attacks)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`
- `Content-Security-Policy`: Must allow Firebase Auth/Firestore websockets, Netlify assets, Giphy API, and WebRTC STUN/TURN traffic.

### Secret Hygiene:
- NEVER commit `.env` files or API secrets into git.
- Only track `.env.example` with sanitized placeholder variables.
- Validate that all public credentials follow environment isolation rules.

---

## 4. Pre-Flight Deployment Checklist
Before triggering any production build or pushing to `main`:
1. [ ] Working tree clean (`git status`).
2. [ ] Zero TypeScript compiler errors (`npx tsc --noEmit` in `apps/web`).
3. [ ] All automated tests green (`npm test` in `apps/web`).
4. [ ] Production web build succeeds (`npm run build`).
5. [ ] Android APK builds without warnings/errors (`cd apps/android && ./gradlew assembleDebug`).
6. [ ] Netlify configuration verified (`netlify.toml`).
