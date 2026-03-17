# Validation: Phase 04 - Performance & Media Optimization

**Phase:** 04
**Goal:** Maximize application speed and optimize media handling via compression, caching, and PWA enhancements.

## Success Criteria

| ID | Criterion | Verification Method |
|----|-----------|--------------------|
| V4.1 | Image Compression | Uploaded images are <500KB and converted to efficient formats (webp/jpeg). |
| V4.2 | BlurHash Previews | Chat images and profiles display a low-res placeholder before loading. |
| V4.3 | Next.js Performance | Build logs confirm PPR active on messaging routes; `src/lib/data.ts` uses `"use cache"`. |
| V4.4 | PWA Offline | Manifest is correct; runtime caching is enabled for core data and assets. |
| V4.5 | Audit Benchmarks | Lighthouse Performance score >= 85 on desktop; Best Practices >= 90. |

## Mandatory Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| PLAN-01 | `.planning/phases/04-performance-media-optimization/04-01-PLAN.md` | Media Foundation Plan. |
| PLAN-02 | `.planning/phases/04-performance-media-optimization/04-02-PLAN.md` | Next.js Optimization Plan. |
| PLAN-03 | `.planning/phases/04-performance-media-optimization/04-03-PLAN.md` | PWA & Audit Plan. |
| SUMMARY-01 | `.planning/phases/04-performance-media-optimization/04-01-SUMMARY.md` | Wave 1 execution report. |
| SUMMARY-02 | `.planning/phases/04-performance-media-optimization/04-02-SUMMARY.md` | Wave 2 execution report. |
| SUMMARY-03 | `.planning/phases/04-performance-media-optimization/04-03-SUMMARY.md` | Wave 3 execution report. |

## Verification Protocol

1. **Pre-Execution:**
   - [x] Research completed (`04-RESEARCH.md`).
   - [x] Plans created (`04-01-PLAN.md`, `04-02-PLAN.md`, `04-03-PLAN.md`).
   - [x] Validation architecture ready (`04-VALIDATION.md`).

2. **Post-Execution:**
   - Verify `browser-image-compression`, `blurhash`, and `react-blurhash` in `package.json`.
   - Verify schema updates in FDC console or `dataconnect/schema/schema.gql`.
   - Run `npx tsc --noEmit` and `npm run lint`.
   - Build the project and inspect the `.next` output for PPR metadata.
   - Run a production build and perform a Lighthouse audit.

## Approval Gates

- [ ] All Wave Summaries created.
- [ ] Lighthouse score targets met.
- [ ] No regression in image upload functionality or quality.
