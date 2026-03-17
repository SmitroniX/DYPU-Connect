# Phase 04 Research: Performance & Media Optimization

## 1. Media Optimization
### Image Compression
- **Tool:** `browser-image-compression`
- **Implementation:** Integrated into `src/lib/storage.ts` or a new `src/lib/media.ts`.
- **Target:** Max width/height 1200px, 80% quality, webp format where supported.
- **Benefit:** Reduces egress costs and storage usage by up to 70-90%.

### BlurHash Previews
- **Tool:** `blurhash` + `canvas`
- **Workflow:** Generate 32x32 hash during client-side compression → Store hash in FDC `DirectMessage` / `GroupMessage` / `PublicMessage` tables → Render using `react-blurhash` or a custom CSS-only gradient component.
- **Benefit:** Instant visual feedback before heavy image loads.

## 2. Next.js 16 Performance
### `use cache` Directive
- **Usage:** Apply to common server-side data fetching functions (e.g., fetching group metadata, student profiles).
- **Strategy:** Cache for 1-5 minutes with revalidation tags (Next.js 16 feature).
- **Benefit:** Reduces DB roundtrips for semi-static data.

### Partial Prerendering (PPR)
- **Status:** Already enabled in `next.config.ts`.
- **Optimization:** Audit `layout.tsx` and main chat containers to ensure dynamic boundaries are wrapped in `<Suspense>` to allow static parts of the shell to stream instantly.

## 3. PWA & Service Worker
### Offline Support
- **Current:** `next-pwa` basic setup.
- **Improvement:** Configure `runtimeCaching` for chat messages and profile images.
- **Goal:** Ensure the app shell and recent chat history are accessible offline.

## 4. Final Performance Audit
- **Tools:** Lighthouse, Web Vitals, Chrome DevTools.
- **Focus:** LCP (image optimization), FID/INP (virtualization checks), CLS (skeleton loaders).
