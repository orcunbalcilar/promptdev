#!/usr/bin/env bash
# =============================================================================
# PromptDev — Local Dev Runner
# =============================================================================
# Runs all services locally for development (no image rebuilds).
# This file is gitignored — safe to customize with your own env values.
#
# Prerequisites:
#   - Node.js 25+   (ui, bot)
#   - pnpm           (ui, bot)
#   - Docker/Podman  (PostgreSQL only)
#
# Usage:
#   ./run-dev.sh              Start all services (db + ui)
#   ./run-dev.sh stop         Stop everything
#   ./run-dev.sh db           Start only PostgreSQL
#   ./run-dev.sh ui     Start only ui
#   ./run-dev.sh bot          Start only Slack bot
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { printf "${CYAN}[dev]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[dev]${NC} %s\n" "$1"; }
err()     { printf "${RED}[dev]${NC} %s\n" "$1"; }

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Environment ──────────────────────────────────────────────────────────────
# Load environment variables from .env file
if [[ -f "$ROOT/.env" ]]; then
  info "Loading environment from .env file..."
  set -a  # Export all variables
  source "$ROOT/.env"
  set +a
  
  # Generate ENCRYPTION_KEY if not set
  if [[ -z "${ENCRYPTION_KEY:-}" ]]; then
    export ENCRYPTION_KEY="$(openssl rand -hex 32)"
    info "Generated new ENCRYPTION_KEY"
  fi

  # Set DATABASE_URL if not set
  if [[ -z "${DATABASE_URL:-}" ]]; then
    export DATABASE_URL="postgresql://promptdev:promptdev@localhost:5432/promptdev"
    info "Using default DATABASE_URL (localhost)"
  fi
else
  err "No .env file found at $ROOT/.env"
  err "Create one from .env.example: cp .env.example .env"
  exit 1
fi

# ── Functions ────────────────────────────────────────────────────────────────
start_db() {
  info "Checking for local PostgreSQL on localhost:5432..."
  if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready -q -h localhost -p 5432; then
      success "Local PostgreSQL detected — skipping container start"
      return 0
    fi
  elif command -v nc >/dev/null 2>&1; then
    if nc -z localhost 5432 >/dev/null 2>&1; then
      success "Local PostgreSQL detected — skipping container start"
      return 0
    fi
  else
    info "No \`pg_isready\`/\`nc\` available — will try containerized PostgreSQL"
  fi

  info "Starting PostgreSQL container..."
  if command -v docker &>/dev/null; then
    docker run -d --name promptdev-db \
      -e POSTGRES_DB=promptdev \
      -e POSTGRES_USER=promptdev \
      -e POSTGRES_PASSWORD=promptdev \
      -p 5432:5432 \
      postgres:18-alpine 2>/dev/null || docker start promptdev-db 2>/dev/null
  elif command -v podman &>/dev/null; then
    podman run -d --name promptdev-db \
      -e POSTGRES_DB=promptdev \
      -e POSTGRES_USER=promptdev \
      -e POSTGRES_PASSWORD=promptdev \
      -p 5432:5432 \
      postgres:18-alpine 2>/dev/null || podman start promptdev-db 2>/dev/null
  else
    err "Docker or Podman required for PostgreSQL"
    exit 1
  fi

  info "Waiting for PostgreSQL to accept connections..."
  for i in $(seq 1 30); do
    if command -v pg_isready >/dev/null 2>&1; then
      pg_isready -h localhost -p 5432 && break
    elif command -v nc >/dev/null 2>&1; then
      nc -z localhost 5432 && break
    fi
    sleep 1
  done

  success "PostgreSQL running on localhost:5432"
}

start_ui() {
    info "Starting ui (Next.js)..."
    cd "$ROOT/promptdev-ui"
    pnpm install && pnpm dev &
    UI_PID=$!
    success "ui starting on http://localhost:3030 (PID: $UI_PID)"
}

start_bot() {
    info "Starting Slack bot..."
    cd "$ROOT/promptdev-bot"
    pnpm install && pnpm dev &
    BOT_PID=$!
    success "Slack bot starting (PID: $BOT_PID)"
}

stop_all() {
    info "Stopping services..."

    # Kill any running Next.js / bot processes
    pkill -f "next-router-worker" 2>/dev/null || true
    pkill -f "promptdev-bot" 2>/dev/null || true

    # Stop the database container
    if command -v docker &>/dev/null; then
        docker stop promptdev-db 2>/dev/null || true
    elif command -v podman &>/dev/null; then
        podman stop promptdev-db 2>/dev/null || true
    fi

    success "All services stopped"
}

# ── Main ─────────────────────────────────────────────────────────────────────
CMD="${1:-all}"

case "$CMD" in
    stop)
        stop_all
        ;;
    db)
        start_db
        ;;
    ui)
        start_ui
        wait
        ;;
    bot)
        start_bot
        wait
        ;;
    all)
        start_db
        start_ui

        echo ""
        success "All services running!"
        info "  ui:  http://localhost:3030"
        info "  Database:  localhost:5432"
        echo ""
        info "Press Ctrl+C to stop all services"

        # Wait and cleanup on exit
        trap stop_all EXIT INT TERM
        wait
        ;;
    *)
        echo "Usage: ./run-dev.sh [all|stop|db|ui|bot]"
        exit 1
        ;;
esac
