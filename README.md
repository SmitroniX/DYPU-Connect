<div align="center">

# ✦ DYPU Connect ✦

**Exclusive social platform for DY Patil University**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-12-orange?style=for-the-badge&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Zustand](https://img.shields.io/badge/Zustand-5-443333?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js->=18-339933?style=for-the-badge&logo=node.js)
![Netlify](https://img.shields.io/badge/Netlify-Deploy-00AD9F?style=for-the-badge&logo=netlify)
![Heroku](https://img.shields.io/badge/Heroku-Deploy-430098?style=for-the-badge&logo=heroku)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[Explore the App](#-key-features) • [Deployment Guide](#-deployment) • [Tech Stack](#-tech-stack)

</div>

---

## 🚀 Key Features

*   **💬 Rich Communication:** Public, private, and group chats with **React Markdown** support and **Giphy** integration.
*   **📂 Media Sharing:** Secure image, audio, and file uploads powered by **Firebase Storage**.
*   **🔍 Global Search:** Advanced indexing to easily find users, groups, and conversations.
*   **🔐 Privacy & Security:** Anonymous chat modes, confession walls, and **Biometric Lock** (Android).
*   **🛡️ Moderation:** AI-powered content filtering and a comprehensive **Admin Dashboard**.
*   **📱 Mobile First:** Responsive design with specialized mobile webview optimizations and PWA support.

---

## 🛠 Prerequisites

| Tool | Version |
| :--- | :--- |
| **Node.js** | ≥ 18.18 |
| **npm / pnpm** | Latest |
| **Firebase CLI** | Required for rules/indexes deployment |

## 💻 Desktop App

### 🌐 As a PWA (Fastest)
1. Open the site in **Chrome** or **Edge**.
2. Click the **Install** icon in the address bar.
3. Provides a native, full-screen experience directly from your browser.

### 🪟 As a Native Windows (.exe)
Located in the `/desktop` directory for a self-contained environment.

**For Developers:**
- `npm run desktop:dev`: Launch the desktop app window for testing.
- `npm run desktop:build`: Build the final Windows installer (`.exe`) in `desktop/dist`.

---

## 💻 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
# Windows
Copy-Item .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```
> [!IMPORTANT]
> Update `.env.local` with your Firebase credentials from the Firebase Console.

### 3. Database Initialization
```bash
npm run deploy:firestore
```

### 4. Launch Development
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

---

## ☁️ Deployment

### 🌐 Netlify
1. Connect repo to [Netlify](https://app.netlify.com).
2. Add environment variables from `.env.example`.
3. Auto-builds via `netlify.toml`.

### 💜 Heroku
1. Create a [Heroku](https://dashboard.heroku.com) app.
2. Add all `NEXT_PUBLIC_*` variables to **Config Vars**.
3. Deploy via GitHub integration.

---

## 📂 Project Structure

```bash
G:/Android/DYPU-Connect/
├── android/              # Native Android App project (Capacitor)
├── desktop/              # Native Windows App project (Electron)
├── src/                  # Next.js web application source
│   ├── app/              # Pages & API routes
│   ├── components/       # UI Library
│   └── ...
├── public/               # Static assets & Manifest
└── ...
```

---

## 🧰 Tech Stack

*   **Core:** Next.js 16, React 19, TypeScript
*   **Backend:** Firebase Auth, Cloud Firestore, Firebase Storage
*   **Styling:** Tailwind CSS 4, Lucide Icons
*   **State:** Zustand
*   **Security:** Biometric API, AI Moderation

---

<div align="center">
Built with ❤️ for DY Patil University
</div>
