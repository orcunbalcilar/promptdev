# syntax=docker/dockerfile:1
# =============================================================================
# PromptDev Bot — Slack Bot (lightweight Node.js)
# =============================================================================

# ── Base: pinned pnpm (matches lockfileVersion 9.0) ──────────────────────────
FROM node:25.6.1-alpine3.23 AS base
RUN npm install -g pnpm@latest
WORKDIR /app

# ── Stage 1: Production dependencies only ────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store

# ── Stage 2: Build TypeScript ────────────────────────────────────────────────
FROM base AS builder
COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY src ./src
RUN pnpm run build

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:25.6.1-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 botjs \
    && adduser --system --uid 1001 bot

COPY --from=deps --chown=bot:botjs /app/node_modules ./node_modules
COPY --from=builder --chown=bot:botjs /app/dist ./dist
COPY --from=builder --chown=bot:botjs /app/package.json ./

USER bot

EXPOSE 3001
CMD ["node", "dist/index.js"]
