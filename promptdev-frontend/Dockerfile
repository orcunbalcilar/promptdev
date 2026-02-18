# =============================================================================
# PromptDev Frontend — Next.js Standalone (lightweight + cached)
# =============================================================================
# Uses standalone output for minimal image size (~150 MB vs ~1 GB).
# Mount .next/cache as a volume for persistent ISR/component caching.
# =============================================================================

FROM node:25-slim AS base

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build application ──────────────────────────────────────────────
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Pre-create cache dir owned by nextjs for ISR/component cache persistence
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
