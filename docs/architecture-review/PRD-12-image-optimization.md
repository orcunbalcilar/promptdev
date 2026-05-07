# PRD-12: Adopt next/Image for All Image Rendering

**Severity:** S4 — Bad but acceptable right now, plan to fix  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

The application uses raw `<img>` HTML tags instead of `next/image` in 5 locations. This forgoes automatic WebP/AVIF conversion, responsive sizing, lazy loading, blur placeholders, and the built-in image optimization pipeline that Next.js provides.

## Evidence

### Files Using Raw `<img>` Tags

| File | Line | Context |
| --- | --- | --- |
| `components/ai-elements/model-selector.tsx` | 182 | Model provider logos |
| `components/ai-elements/image.tsx` | 16 | AI-generated image display |
| `components/ai-elements/queue.tsx` | 155 | Queue item image |
| `components/ai-elements/attachments.tsx` | 95 | Attachment thumbnail |
| `components/ai-elements/attachments.tsx` | 103 | Attachment full image |

### Zero `next/image` Imports

Search for `import Image from "next/image"` or `from 'next/image'`: **0 results**

### Impact

- No automatic image format optimization (WebP/AVIF)
- No responsive `srcset` generation
- No lazy loading with intersection observer
- No blur placeholder for perceived performance
- No protection against layout shift (CLS)
- All images load eagerly at full resolution

## Goals

1. Replace raw `<img>` with `next/image` `<Image>` component where applicable
2. Configure `remotePatterns` in `next.config.ts` for external image sources
3. Add proper `width`/`height` or `fill` props to prevent CLS

## Non-Goals

- Adding CDN or external image optimization
- Implementing custom image loading library
- Converting SVG icons to Image components

## Proposed Design

### 1. Update `next.config.ts` for remote images

```typescript
const nextConfig: NextConfig = {
  // ... existing config
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
      // Add other external image hosts as discovered
    ],
  },
};
```

### 2. Replace `<img>` with `<Image>`

```typescript
// Before:
<img src={src} alt={alt} className="..." />

// After:
import Image from "next/image";
<Image src={src} alt={alt} width={width} height={height} className="..." />

// Or for fill mode (unknown dimensions):
<div className="relative w-full aspect-video">
  <Image src={src} alt={alt} fill className="object-cover" />
</div>
```

### 3. Attachment Images (Dynamic Sources)

For user-uploaded attachments with unknown dimensions, use `fill` mode with appropriate container sizing.

## Acceptance Criteria

- [ ] All 5 `<img>` tags replaced with `next/image` `<Image>` component
- [ ] `remotePatterns` configured for all external image sources
- [ ] All images have `width`/`height` or `fill` props
- [ ] No Cumulative Layout Shift (CLS) regressions
- [ ] Images serve in WebP/AVIF format where browser supports
- [ ] Lazy loading verified for below-fold images

## Risks

| Risk | Mitigation |
| --- | --- |
| Dynamic image sources not whitelisted | Add `remotePatterns` progressively; use `unoptimized` flag for unknown sources |
| Image dimension unknown at render time | Use `fill` prop with aspect-ratio container |

## Dependencies

- None
