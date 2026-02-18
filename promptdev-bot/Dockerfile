# =============================================================================
# PromptDev Bot — Slack Bot (lightweight Node.js)
# =============================================================================

FROM node:25-slim AS base

# ── Stage 1: Production dependencies only ────────────────────────────────────
FROM base AS deps
RUN npm install -g pnpm@latest
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: Build TypeScript ────────────────────────────────────────────────
FROM base AS builder
RUN npm install -g pnpm@latest
WORKDIR /app
COPY package.json pnpm-lock.yaml* tsconfig.json ./
RUN pnpm install --frozen-lockfile
COPY src ./src
RUN pnpm run build

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 botjs \
    && adduser --system --uid 1001 bot

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER bot

EXPOSE 3001
CMD ["node", "dist/index.js"]
