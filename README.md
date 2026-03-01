# ✦ DYPU Connect

Exclusive social platform for DY Patil University — built with **Next.js 16**, **Firebase**, and **Tailwind CSS 4**.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.18 |
| npm / pnpm / yarn | latest |
| Firebase CLI (optional) | latest — for deploying Firestore rules & indexes |

---

## Getting Started (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Open `.env.local` and replace the placeholder values with your real Firebase Web App config from:
**Firebase Console → Project Settings → General → Your apps → SDK setup and configuration**

### 3. Deploy Firestore indexes (one-time)

The app uses composite indexes. Deploy them to avoid the `failed-precondition` error:

```bash
npm run deploy:firestore
# or: npx firebase deploy --only firestore
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy on Vercel

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. In **Settings → Environment Variables**, add every variable from `.env.example` with real values.
4. Vercel auto-detects Next.js — just click **Deploy**.
5. After deploy, add your Vercel domain (`*.vercel.app`) to:
   - **Firebase Console → Authentication → Settings → Authorized domains**
   - **Google Cloud Console → OAuth 2.0 → Authorized redirect URIs** (if using Google Drive upload)

> The `vercel.json` in this repo already sets security headers and caching rules.

---

## Deploy on Netlify

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Import the project at [app.netlify.com/start](https://app.netlify.com/start).
3. Netlify auto-detects the build settings from `netlify.toml`.
4. In **Site Settings → Environment Variables**, add every variable from `.env.example` with real values.
5. Click **Deploy site**.
6. After deploy, add your Netlify domain (`*.netlify.app`) to:
   - **Firebase Console → Authentication → Settings → Authorized domains**
   - **Google Cloud Console → OAuth 2.0 → Authorized redirect URIs** (if using Google Drive upload)

> The `netlify.toml` and `@netlify/plugin-nextjs` handle SSR, ISR, image optimization, and routing automatically.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | ❌ | Google Analytics measurement ID |
| `NEXT_PUBLIC_GIPHY_API_KEY` | ❌ | Giphy API key (GIF picker hidden if blank) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID for Drive upload |

> **Important:** All `NEXT_PUBLIC_*` variables are embedded at **build time**, not runtime. If you change them, you must rebuild.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run deploy:firestore` | Deploy Firestore rules & indexes |

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── admin/            # Admin dashboard (role-gated)
│   ├── anonymous-chat/   # Anonymous public chat
│   ├── confessions/      # Confession wall
│   ├── groups/           # Group chats
│   ├── messages/         # Private DMs
│   ├── profile/          # User profile
│   └── ...
├── components/           # Shared React components
├── lib/                  # Firebase, utils, third-party helpers
├── store/                # Zustand global state
└── types/                # TypeScript type definitions
```

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth & DB:** Firebase Auth (passwordless email link) + Cloud Firestore
- **Styling:** Tailwind CSS 4
- **State:** Zustand
- **Icons:** Lucide React
- **Deploy:** Vercel or Netlify
