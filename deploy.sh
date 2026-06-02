#!/usr/bin/env bash
# =============================================================================
# PromptDev — One-Command Deploy
# =============================================================================
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/orcunbalcilar/promptdev/main/deploy.sh | bash
#
# Or locally:
#   ./deploy.sh
#
# What this script does:
#   1. Clones the repo (if not already in it)
#   2. Auto-generates ENCRYPTION_KEY and AUTH_SECRET
#   3. Interactively asks for your integration tokens
#   4. Writes .env and starts all services via Docker Compose
# =============================================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { printf "${CYAN}[PromptDev]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[PromptDev]${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}[PromptDev]${NC} %s\n" "$1"; }
err()     { printf "${RED}[PromptDev]${NC} %s\n" "$1"; }
header()  { printf "\n${BOLD}${CYAN}── %s ──${NC}\n\n" "$1"; }
hint()    { printf "  ${DIM}%s${NC}\n" "$1"; }

# ── Arguments ──────────────────────────────────────────────────────────────
ENV_FILE_OPTION=""
ENV_FILE=""

show_help() {
    cat <<'EOF'
Usage: ./deploy.sh [options]

Options:
  -e, --env-file <path>   Path to a .env file to load and update
  -h, --help              Show this help message
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--env-file)
                ENV_FILE_OPTION="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                err "Unknown argument: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# ── Helpers ──────────────────────────────────────────────────────────────────
prompt_value() {
    local varname="$1" prompt="$2" default="${3:-}"
    local value
    if [ -n "$default" ]; then
        printf "  ${BOLD}%s${NC} ${DIM}[%s]${NC}: " "$prompt" "$default"
    else
        printf "  ${BOLD}%s${NC}: " "$prompt"
    fi
    read -r value
    value="${value:-$default}"
    eval "$varname=\"\$value\""
}

prompt_secret() {
    local varname="$1" prompt="$2"
    printf "  ${BOLD}%s${NC}: " "$prompt"
    read -rs value
    printf "\n"
    eval "$varname=\"\$value\""
}

prompt_yes_no() {
    local prompt="$1" default="${2:-y}"
    local answer
    if [ "$default" = "y" ]; then
        printf "  ${BOLD}%s${NC} ${DIM}[Y/n]${NC}: " "$prompt"
    else
        printf "  ${BOLD}%s${NC} ${DIM}[y/N]${NC}: " "$prompt"
    fi
    read -r answer
    answer="${answer:-$default}"
    [[ "$answer" =~ ^[Yy] ]]
}

generate_secret() {
    openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 64
}

resolve_env_file() {
    if [ -n "$ENV_FILE_OPTION" ]; then
        if [[ "$ENV_FILE_OPTION" = /* ]]; then
            ENV_FILE="$ENV_FILE_OPTION"
        else
            ENV_FILE="$PROJECT_DIR/$ENV_FILE_OPTION"
        fi
    else
        ENV_FILE="$PROJECT_DIR/.env"
    fi
}

load_env_file() {
    if [ -f "$ENV_FILE" ]; then
        info "Loading environment from $ENV_FILE"
        set -a
        # shellcheck disable=SC1090
        . "$ENV_FILE"
        set +a
    else
        warn "Env file not found at $ENV_FILE (a new one will be created)"
    fi
}

# ── Detect container runtime ────────────────────────────────────────────────
detect_runtime() {
    if command -v docker &>/dev/null; then
        COMPOSE="docker compose"
        info "Using Docker"
    elif command -v podman-compose &>/dev/null; then
        COMPOSE="podman-compose"
        info "Using Podman (podman-compose)"
    elif command -v podman &>/dev/null; then
        COMPOSE="podman compose"
        info "Using Podman"
    else
        err "Docker or Podman is required but not found."
        echo ""
        hint "Install Docker: https://docs.docker.com/get-docker/"
        hint "Install Podman: https://podman.io/getting-started/installation"
        exit 1
    fi
}

# ── Clone repo if needed ────────────────────────────────────────────────────
ensure_repo() {
    if [ -f "docker-compose.yml" ] && [ -d "promptdev-ui" ]; then
        PROJECT_DIR="$(pwd)"
        return
    fi

    if [ -d "promptdev" ] && [ -f "promptdev/docker-compose.yml" ]; then
        PROJECT_DIR="$(cd promptdev && pwd)"
        cd "$PROJECT_DIR"
        return
    fi

    info "Cloning PromptDev..."
    git clone https://github.com/orcunbalcilar/promptdev.git
    PROJECT_DIR="$(cd promptdev && pwd)"
    cd "$PROJECT_DIR"
    success "Cloned to $PROJECT_DIR"
}

# =============================================================================
# Main
# =============================================================================
main() {
    parse_args "$@"

    printf "\n${BOLD}${CYAN}"
    printf "  ╔═══════════════════════════════════════════════╗\n"
    printf "  ║         PromptDev — Deploy Wizard             ║\n"
    printf "  ║   AI-Powered Development Platform             ║\n"
    printf "  ╚═══════════════════════════════════════════════╝\n"
    printf "${NC}\n"

    detect_runtime
    ensure_repo
    resolve_env_file
    load_env_file

    # ── Auto-generate secrets ────────────────────────────────────────────────
    header "Auto-Generated Secrets"

    if [ -z "${ENCRYPTION_KEY:-}" ]; then
        ENCRYPTION_KEY="$(generate_secret)"
        success "ENCRYPTION_KEY generated (AES-256 — encrypts all stored tokens)"
    else
        success "ENCRYPTION_KEY loaded from env file"
    fi

    if [ -z "${AUTH_SECRET:-}" ]; then
        AUTH_SECRET="$(generate_secret)"
        success "AUTH_SECRET generated (NextAuth.js session signing key)"
    else
        success "AUTH_SECRET loaded from env file"
    fi

    # ── GitHub OAuth ─────────────────────────────────────────────────────────
    header "GitHub OAuth (required for sign-in)"

    echo "  PromptDev uses GitHub OAuth so users can sign in with their GitHub account."
    echo "  You need to create a GitHub OAuth App to get a Client ID and Secret."
    echo ""
    hint "1. Go to: https://github.com/settings/developers"
    hint "2. Click 'OAuth Apps' → 'New OAuth App'"
    hint "3. Fill in:"
    hint "     Application name:  PromptDev"
    hint "     Homepage URL:      http://localhost:3000"
    hint "     Callback URL:      http://localhost:3000/api/auth/callback/github"
    hint "4. Click 'Register application'"
    hint "5. Copy the Client ID, then generate a Client Secret"
    echo ""

    if [ -n "${AUTH_GITHUB_ID:-}" ] && [ -n "${AUTH_GITHUB_SECRET:-}" ]; then
        success "GitHub OAuth credentials loaded from env file"
    else
        warn "Missing GitHub OAuth credentials. Please provide the values below."
        prompt_value AUTH_GITHUB_ID "GitHub OAuth Client ID" "${AUTH_GITHUB_ID:-}"
        if [ -z "${AUTH_GITHUB_SECRET:-}" ]; then
            prompt_secret AUTH_GITHUB_SECRET "GitHub OAuth Client Secret"
        fi
    fi

    # ── GitHub Token (Copilot SDK) ───────────────────────────────────────────
    header "GitHub Token — Copilot SDK (required for AI features)"

    echo "  The AI agent uses GitHub Copilot SDK, which needs a GitHub personal access token."
    echo ""
    hint "1. Go to: https://github.com/settings/tokens"
    hint "2. Click 'Generate new token (classic)'"
    hint "3. Select scopes: 'copilot' (required)"
    hint "4. Copy the generated token (starts with ghp_ or github_pat_)"
    echo ""

    if [ -n "${GITHUB_TOKEN:-}" ]; then
        success "GitHub token loaded from env file"
    else
        warn "Missing GitHub token. Please provide it below."
        prompt_secret GITHUB_TOKEN "GitHub Personal Access Token"
    fi

    # ── Google OAuth (optional) ──────────────────────────────────────────────
    header "Google OAuth (optional — adds 'Sign in with Google')"

    AUTH_GOOGLE_ID="${AUTH_GOOGLE_ID:-}"
    AUTH_GOOGLE_SECRET="${AUTH_GOOGLE_SECRET:-}"

    if [ -n "$AUTH_GOOGLE_ID" ] || [ -n "$AUTH_GOOGLE_SECRET" ]; then
        if [ -z "$AUTH_GOOGLE_ID" ] || [ -z "$AUTH_GOOGLE_SECRET" ]; then
            warn "Google OAuth is partially configured. Please provide missing values."
        else
            success "Google OAuth credentials loaded from env file"
        fi
    elif prompt_yes_no "Set up Google OAuth?" "n"; then
        echo ""
        hint "1. Go to: https://console.cloud.google.com/apis/credentials"
        hint "2. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
        hint "3. Application type: 'Web application'"
        hint "4. Authorized redirect URI: http://localhost:3000/api/auth/callback/google"
        hint "5. Copy the Client ID and Client Secret"
        echo ""

        prompt_value AUTH_GOOGLE_ID "Google OAuth Client ID" "${AUTH_GOOGLE_ID:-}"
        if [ -z "${AUTH_GOOGLE_SECRET:-}" ]; then
            prompt_secret AUTH_GOOGLE_SECRET "Google OAuth Client Secret"
        fi
    fi

    if [ -n "$AUTH_GOOGLE_ID" ] && [ -n "$AUTH_GOOGLE_SECRET" ]; then
        success "Google OAuth configured"
    fi

    # ── Bitbucket (optional) ─────────────────────────────────────────────────
    header "Bitbucket Server (optional — for repository & PR integration)"

    BITBUCKET_URL="${BITBUCKET_URL:-}"
    BITBUCKET_USERNAME="${BITBUCKET_USERNAME:-}"
    BITBUCKET_TOKEN="${BITBUCKET_TOKEN:-}"

    if [ -n "$BITBUCKET_URL" ] || [ -n "$BITBUCKET_USERNAME" ] || [ -n "$BITBUCKET_TOKEN" ]; then
        if [ -z "$BITBUCKET_URL" ] || [ -z "$BITBUCKET_USERNAME" ] || [ -z "$BITBUCKET_TOKEN" ]; then
            warn "Bitbucket integration is partially configured. Please provide missing values."
        else
            success "Bitbucket credentials loaded from env file"
        fi
    elif prompt_yes_no "Set up Bitbucket integration?" "n"; then
        echo ""
        echo "  Connect to your Bitbucket Server instance for repository browsing and PR creation."
        echo "  You need a personal access token (not a password)."
        echo ""
        hint "1. Go to your Bitbucket Server → Profile → Personal Access Tokens"
        hint "2. Click 'Create a token'"
        hint "3. Name: PromptDev"
        hint "4. Permissions: Project read, Repository read+write"
        hint "5. Copy the generated token"
        echo ""

        prompt_value BITBUCKET_URL "Bitbucket Server URL (e.g. https://bitbucket.company.com)" "${BITBUCKET_URL:-}"
        prompt_value BITBUCKET_USERNAME "Bitbucket username" "${BITBUCKET_USERNAME:-}"
        if [ -z "${BITBUCKET_TOKEN:-}" ]; then
            prompt_secret BITBUCKET_TOKEN "Bitbucket personal access token"
        fi
    fi

    if [ -n "$BITBUCKET_URL" ] && [ -n "$BITBUCKET_USERNAME" ] && [ -n "$BITBUCKET_TOKEN" ]; then
        success "Bitbucket integration configured"
    fi

    # ── Jira (optional) ──────────────────────────────────────────────────────
    header "Jira Server (optional — for issue tracking integration)"

    JIRA_URL="${JIRA_URL:-}"
    JIRA_USERNAME="${JIRA_USERNAME:-}"
    JIRA_TOKEN="${JIRA_TOKEN:-}"

    if [ -n "$JIRA_URL" ] || [ -n "$JIRA_USERNAME" ] || [ -n "$JIRA_TOKEN" ]; then
        if [ -z "$JIRA_URL" ] || [ -z "$JIRA_USERNAME" ] || [ -z "$JIRA_TOKEN" ]; then
            warn "Jira integration is partially configured. Please provide missing values."
        else
            success "Jira credentials loaded from env file"
        fi
    elif prompt_yes_no "Set up Jira integration?" "n"; then
        echo ""
        echo "  Connect to your Jira Server for issue tracking, status updates, and auto-task creation."
        echo "  You need a personal access token."
        echo ""
        hint "1. Go to your Jira Server → Profile → Personal Access Tokens"
        hint "2. Click 'Create token'"
        hint "3. Name: PromptDev"
        hint "4. Copy the generated token"
        echo ""

        prompt_value JIRA_URL "Jira Server URL (e.g. https://jira.company.com)" "${JIRA_URL:-}"
        prompt_value JIRA_USERNAME "Jira username" "${JIRA_USERNAME:-}"
        if [ -z "${JIRA_TOKEN:-}" ]; then
            prompt_secret JIRA_TOKEN "Jira personal access token"
        fi
    fi

    if [ -n "$JIRA_URL" ] && [ -n "$JIRA_USERNAME" ] && [ -n "$JIRA_TOKEN" ]; then
        success "Jira integration configured"
    fi

    # ── Slack (optional) ─────────────────────────────────────────────────────
    header "Slack Bot (optional — manage tasks from Slack)"

    SLACK_BOT_TOKEN="${SLACK_BOT_TOKEN:-}"
    SLACK_APP_TOKEN="${SLACK_APP_TOKEN:-}"
    SLACK_SIGNING_SECRET="${SLACK_SIGNING_SECRET:-}"
    DEPLOY_SLACK=false

    if [ -n "$SLACK_BOT_TOKEN" ] || [ -n "$SLACK_APP_TOKEN" ] || [ -n "$SLACK_SIGNING_SECRET" ]; then
        DEPLOY_SLACK=true
        if [ -z "$SLACK_BOT_TOKEN" ] || [ -z "$SLACK_APP_TOKEN" ] || [ -z "$SLACK_SIGNING_SECRET" ]; then
            warn "Slack bot is partially configured. Please provide missing values."
        else
            success "Slack bot credentials loaded from env file"
        fi
    elif prompt_yes_no "Set up Slack bot?" "n"; then
        DEPLOY_SLACK=true
        echo ""
        echo "  The Slack bot lets your team create and monitor tasks via /pd commands."
        echo "  It uses Socket Mode — no public URL needed."
        echo ""
        hint "Step 1: Create a Slack App"
        hint "  → Go to: https://api.slack.com/apps"
        hint "  → Click 'Create New App' → 'From scratch'"
        hint "  → Name: PromptDev, pick your workspace"
        echo ""
        hint "Step 2: Enable Socket Mode"
        hint "  → Settings → Socket Mode → Enable"
        hint "  → Generate an App-Level Token with scope: connections:write"
        hint "  → Copy the token (starts with xapp-)"
        echo ""
        hint "Step 3: Add Bot Permissions"
        hint "  → Features → OAuth & Permissions → Bot Token Scopes"
        hint "  → Add: commands, chat:write, connections:write"
        echo ""
        hint "Step 4: Add Slash Command"
        hint "  → Features → Slash Commands → Create New Command"
        hint "  → Command: /pd"
        hint "  → Request URL: (leave empty for Socket Mode)"
        hint "  → Description: PromptDev AI assistant"
        echo ""
        hint "Step 5: Install to Workspace"
        hint "  → Settings → Install App → Install to Workspace"
        hint "  → Copy the Bot User OAuth Token (starts with xoxb-)"
        echo ""
        hint "Step 6: Get Signing Secret"
        hint "  → Settings → Basic Information → App Credentials"
        hint "  → Copy the Signing Secret"
        echo ""

        if [ -z "${SLACK_BOT_TOKEN:-}" ]; then
            prompt_secret SLACK_BOT_TOKEN "Slack Bot Token (xoxb-...)"
        fi
        if [ -z "${SLACK_APP_TOKEN:-}" ]; then
            prompt_secret SLACK_APP_TOKEN "Slack App-Level Token (xapp-...)"
        fi
        if [ -z "${SLACK_SIGNING_SECRET:-}" ]; then
            prompt_secret SLACK_SIGNING_SECRET "Slack Signing Secret"
        fi
    fi

    if $DEPLOY_SLACK && [ -n "$SLACK_BOT_TOKEN" ] && [ -n "$SLACK_APP_TOKEN" ] && [ -n "$SLACK_SIGNING_SECRET" ]; then
        success "Slack bot configured"
    fi

    # ── Write .env ───────────────────────────────────────────────────────────
    header "Writing Configuration"

    NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"

    mkdir -p "$(dirname "$ENV_FILE")"

    cat > "$ENV_FILE" << ENVEOF
# =============================================================================
# PromptDev — Environment Configuration
# =============================================================================
# Auto-generated by deploy.sh — $(date '+%Y-%m-%d %H:%M:%S')
# =============================================================================

# ── Encryption (auto-generated — do not change after first deploy) ──────────
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ── Frontend / NextAuth.js ──────────────────────────────────────────────────
NEXTAUTH_URL=${NEXTAUTH_URL}
AUTH_SECRET=${AUTH_SECRET}
AUTH_GITHUB_ID=${AUTH_GITHUB_ID}
AUTH_GITHUB_SECRET=${AUTH_GITHUB_SECRET}
AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}

# ── GitHub / Copilot SDK ────────────────────────────────────────────────────
GITHUB_TOKEN=${GITHUB_TOKEN}

# ── Bitbucket Server ───────────────────────────────────────────────────────
BITBUCKET_URL=${BITBUCKET_URL}
BITBUCKET_USERNAME=${BITBUCKET_USERNAME}
BITBUCKET_TOKEN=${BITBUCKET_TOKEN}

# ── Slack Bot ───────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
SLACK_APP_TOKEN=${SLACK_APP_TOKEN}
SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}

# ── Jira Server ─────────────────────────────────────────────────────────────
JIRA_URL=${JIRA_URL}
JIRA_USERNAME=${JIRA_USERNAME}
JIRA_TOKEN=${JIRA_TOKEN}
ENVEOF

    chmod 600 "$ENV_FILE"
    success "Configuration written to $ENV_FILE"

    # ── Deploy ───────────────────────────────────────────────────────────────
    header "Deploying Services"

    info "Building and starting containers (first build may take ~15 minutes)..."
    echo ""

    COMPOSE_CMD="$COMPOSE --env-file \"$ENV_FILE\" up -d --build"
    if $DEPLOY_SLACK; then
        COMPOSE_CMD="$COMPOSE --env-file \"$ENV_FILE\" --profile slack up -d --build"
    fi

    eval "$COMPOSE_CMD"

    # ── Done ─────────────────────────────────────────────────────────────────
    echo ""
    printf "${GREEN}${BOLD}"
    printf "  ╔═══════════════════════════════════════════════╗\n"
    printf "  ║           Deployment Complete!                ║\n"
    printf "  ╚═══════════════════════════════════════════════╝\n"
    printf "${NC}\n"

    info "Services:"
    info "  Frontend:  http://localhost:3000"
    info "  Database:  localhost:5432"
    if $DEPLOY_SLACK; then
        info "  Slack Bot: Running (Socket Mode)"
    fi
    echo ""
    info "Useful commands:"
    hint "  $COMPOSE logs -f              Follow logs"
    hint "  $COMPOSE ps                   Check status"
    hint "  $COMPOSE down                 Stop services"
    hint "  $COMPOSE down -v              Stop + delete all data"
    echo ""
    success "Open http://localhost:3000 to get started!"
}

main "$@"
