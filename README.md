<div align="center">

# ✦ DYPU Connect ✦

**Official Professional Monorepo for DY Patil University Social Platform**

[![CI/CD Web](https://github.com/SmitroniX/DYPU-Connect/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/SmitroniX/DYPU-Connect/actions)
[![Android APK](https://github.com/SmitroniX/DYPU-Connect/actions/workflows/build-android.yml/badge.svg)](https://github.com/SmitroniX/DYPU-Connect/actions)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[Development](#-getting-started) • [Apps & Architecture](#-monorepo-structure) • [CI/CD](#-automation)

</div>

---

## 📂 Monorepo Structure

This project follows a professional **Workspace-based monorepo** architecture for high scalability and code reuse.

### 📱 Apps (`/apps`)
*   **`web`**: Next.js 16 + React 19 web application. The core engine.
*   **`desktop`**: Electron-based Windows application wrapper.
*   **`android`**: Native Android wrapper providing biometric security and native features.

### 📦 Packages (`/packages`)
*   **`shared`**: Shared TypeScript types, Zod validation schemas, and common utilities.

---

## 🚀 Getting Started

### 1. Unified Installation
From the root directory, install dependencies for all apps at once:
```bash
npm install
```

### 2. Environment Configuration
The monorepo uses centralized environment management.
```bash
cp .env.example .env.local
```
*Note: Ensure your Firebase credentials are added to `.env.local`.*

### 3. Development Commands
Use the root scripts to orchestrate development:

| Command | Action |
| :--- | :--- |
| `npm run web:dev` | Start the Next.js development server |
| `npm run desktop:dev` | Start the Electron app in development mode |
| `npm run build:all` | Build both Web and Desktop production bundles |
| `npm run lint` | Run ESLint across the entire monorepo |

---

## ☁️ Automation (CI/CD)

The project uses high-grade **GitHub Actions** for automated builds and releases:

*   **Windows:** Automatically builds a signed `.exe` and creates a GitHub Release on every push to `main`.
*   **Android:** Decodes secrets, decodes your production keystore, and builds a signed **Release APK** automatically.
*   **Web:** Connected via Netlify for instantaneous production deployments.

---

## 🛠 Branching Strategy

We follow the **GitHub Flow** professional model:
1.  `main`: Production-ready code only.
2.  `develop`: Active integration branch for upcoming features.
3.  `feature/*`: Individual branches for specific tasks (e.g., `feature/messaging-ui`).

*Always create a Pull Request into `develop` before merging into `main`.*

---

## 🧰 Tech Stack

*   **Core:** Next.js 16 (PPR enabled), React 19, TypeScript 5
*   **Native:** Electron (Windows), Java (Android Native Bridge)
*   **Database:** Firebase Data Connect (PostgreSQL) & Cloud Firestore
*   **Animation:** Framer Motion (Project-wide)
*   **Optimization:** browser-image-compression, BlurHash placeholders

---

<div align="center">
Maintained by **CodeVerseOrg** & **SmitroniX**
</div>
