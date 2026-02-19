# syntax=docker/dockerfile:1
# =============================================================================
# PromptDev Frontend — Next.js Standalone (lightweight + cached)
# =============================================================================
# Uses standalone output for minimal image size (~150 MB vs ~1 GB).
# Mount .next/cache as a volume for persistent ISR/component caching.
# =============================================================================

# ── Base: pinned pnpm (matches lockfileVersion 9.0) ──────────────────────────
FROM node:25.6.1-alpine3.23 AS base
RUN npm install -g pnpm@latest
WORKDIR /app

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ── Stage 2: Build application ──────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm run build

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:25.6.1-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Pre-create cache dir owned by nextjs for ISR/component cache persistence
RUN install -d -m 0755 -o nextjs -g nodejs .next/cache

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
