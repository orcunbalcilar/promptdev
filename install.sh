#!/bin/bash
set -e

# ============================================================================
# PromptDev Installer
# ============================================================================
# One-command installation for the PromptDev AI development platform.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/orcunbalcilar/promptdev/main/install.sh | bash
#
# Or locally:
#   chmod +x install.sh && ./install.sh
#
# What this script does:
#   1. Checks prerequisites (Java, Node.js, Git)
#   2. Installs missing prerequisites (with user consent)
#   3. Asks for configuration (Slack secrets, Bitbucket, install dir)
#   4. Clones the repository
#   5. Configures environment variables
#   6. Starts all services
#
# PostgreSQL is required — the installer detects it via:
#   local install → Docker → Podman
# ============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PromptDev]${NC} $1"; }
warn() { echo -e "${YELLOW}[PromptDev]${NC} $1"; }
err()  { echo -e "${RED}[PromptDev]${NC} $1"; }
info() { echo -e "${BLUE}[PromptDev]${NC} $1"; }
hr()   { echo -e "${GREEN}────────────────────────────────────────────────────────${NC}"; }

REPO_URL="https://github.com/orcunbalcilar/promptdev.git"
DEFAULT_INSTALL_DIR="$HOME/promptdev"
INSTALL_DIR=""
CONTAINER_ENGINE=""

# ── OS Detection ────────────────────────────────────────────────────────────

detect_os() {
  case "$(uname -s)" in
    Darwin) OS="macos" ;;
    Linux)  OS="linux" ;;
    *)      OS="unknown" ;;
  esac
}

detect_package_manager() {
  if command -v brew &> /dev/null; then
    PKG_MANAGER="brew"
  elif command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
  elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
  elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
  else
    PKG_MANAGER="none"
  fi
}

detect_container_engine() {
  if command -v docker &> /dev/null; then
    CONTAINER_ENGINE="docker"
  elif command -v podman &> /dev/null; then
    CONTAINER_ENGINE="podman"
  fi
}

# ── Prerequisites Check ────────────────────────────────────────────────────

check_command() {
  command -v "$1" &> /dev/null
}

install_prerequisite() {
  local tool="$1"
  local pkg_name="$2"

  echo ""
  warn "$tool is not installed."
  read -r -p "$(echo -e "${YELLOW}[PromptDev]${NC} Install $tool? [Y/n]: ")" answer
  answer="${answer:-y}"

  if [[ "$answer" =~ ^[Yy]$ ]]; then
    case "$PKG_MANAGER" in
      brew) brew install "$pkg_name" ;;
      apt)  sudo apt-get update && sudo apt-get install -y "$pkg_name" ;;
      dnf)  sudo dnf install -y "$pkg_name" ;;
      yum)  sudo yum install -y "$pkg_name" ;;
      *)    err "No supported package manager found. Please install $tool manually."; exit 1 ;;
    esac
    log "$tool installed successfully."
  else
    err "$tool is required. Please install it and re-run the installer."
    exit 1
  fi
}

check_prerequisites() {
  hr
  log "Checking prerequisites..."
  echo ""

  # Java
  if check_command java; then
    java_version=$(java --version 2>&1 | head -1)
    log "✓ Java: $java_version"
  else
    install_prerequisite "Java 21" "openjdk@21"
  fi

  # Node.js
  if check_command node; then
    node_version=$(node --version)
    log "✓ Node.js: $node_version"
  else
    install_prerequisite "Node.js" "node"
  fi

  # npm
  if check_command npm; then
    npm_version=$(npm --version)
    log "✓ npm: $npm_version"
  else
    install_prerequisite "npm" "npm"
  fi

  # Git
  if check_command git; then
    git_version=$(git --version)
    log "✓ Git: $git_version"
  else
    install_prerequisite "Git" "git"
  fi

  # Container engine (needed for PostgreSQL unless already running locally)
  detect_container_engine
  if [ -n "$CONTAINER_ENGINE" ]; then
    log "✓ Container engine: $CONTAINER_ENGINE"
  else
    warn "No container engine (Docker/Podman) found."
    warn "PostgreSQL must be installed and running locally on :5432."
  fi

  echo ""
  log "All prerequisites satisfied."
}

# ── User Configuration ──────────────────────────────────────────────────────

prompt_install_dir() {
  hr
  echo ""
  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Installation directory [${DEFAULT_INSTALL_DIR}]: ")" INSTALL_DIR
  INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"
  INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"
  log "Will install to: $INSTALL_DIR"
}

prompt_slack_config() {
  hr
  echo ""
  info "Slack Bot configuration (optional — press Enter to skip)"
  echo ""
  echo "  To set up the Slack bot, you need:"
  echo "  1. Create a Slack App at https://api.slack.com/apps"
  echo "  2. Enable Socket Mode → generate an App-Level Token (connections:write scope)"
  echo "  3. Add OAuth scopes: chat:write, commands"
  echo "  4. Install the app to your workspace"
  echo "  5. Copy the Bot User OAuth Token (xoxb-...), App-Level Token (xapp-...),"
  echo "     and Signing Secret from your app settings"
  echo ""

  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Slack Bot Token (xoxb-...): ")" SLACK_BOT_TOKEN
  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Slack App Token (xapp-...): ")" SLACK_APP_TOKEN
  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Slack Signing Secret: ")" SLACK_SIGNING_SECRET

  if [ -n "$SLACK_BOT_TOKEN" ]; then
    log "Slack bot configuration saved."
  else
    warn "Skipping Slack bot setup. You can configure it later."
  fi
}

prompt_bitbucket_config() {
  hr
  echo ""
  info "Bitbucket Server configuration (optional — press Enter to skip)"
  echo ""
  echo "  Or configure in the web UI Settings page after installation."
  echo ""

  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Bitbucket Server URL (e.g. https://bitbucket.company.com): ")" BITBUCKET_URL
  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Bitbucket Project Key: ")" BITBUCKET_PROJECT_KEY
  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Bitbucket Username: ")" BITBUCKET_USERNAME
  read -r -s -p "$(echo -e "${BLUE}[PromptDev]${NC} Bitbucket Token: ")" BITBUCKET_TOKEN
  echo ""

  if [ -n "$BITBUCKET_URL" ]; then
    log "Bitbucket configuration saved."
  else
    warn "Skipping Bitbucket setup. Configure via Settings in the web UI."
  fi
}

prompt_jira_config() {
  hr
  echo ""
  info "Jira Server configuration (optional — press Enter to skip)"
  echo ""
  echo "  Connect your Jira Server instance to link tasks to Jira issues."
  echo "  The agent can update issue status and add comments with PR links."
  echo "  Or configure in the web UI Settings page after installation."
  echo ""

  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Jira Server URL (e.g. https://jira.company.com): ")" JIRA_URL
  read -r -p "$(echo -e "${BLUE}[PromptDev]${NC} Jira Username: ")" JIRA_USERNAME
  read -r -s -p "$(echo -e "${BLUE}[PromptDev]${NC} Jira Token: ")" JIRA_TOKEN
  echo ""

  if [ -n "$JIRA_URL" ]; then
    log "Jira configuration saved."
  else
    warn "Skipping Jira setup. Configure via Settings in the web UI."
  fi
}

prompt_github_token() {
  hr
  echo ""
  info "GitHub / Copilot token (optional — press Enter to skip)"
  echo ""
  echo "  Provide a personal GitHub token for Copilot SDK sessions."
  echo "  Supported types: github_pat_..., gho_..., ghu_..."
  echo "  Or configure per-user in the web UI Settings page."
  echo ""

  read -r -s -p "$(echo -e "${BLUE}[PromptDev]${NC} GitHub Token: ")" GITHUB_TOKEN
  echo ""

  if [ -n "$GITHUB_TOKEN" ]; then
    log "GitHub token saved."
  else
    warn "Skipping. Configure per-user via Settings in the web UI."
  fi
}

# ── Installation ────────────────────────────────────────────────────────────

clone_repository() {
  hr
  echo ""
  log "Cloning PromptDev..."

  if [ -d "$INSTALL_DIR" ]; then
    warn "Directory already exists: $INSTALL_DIR"
    read -r -p "$(echo -e "${YELLOW}[PromptDev]${NC} Update existing installation? [Y/n]: ")" update
    update="${update:-y}"

    if [[ "$update" =~ ^[Yy]$ ]]; then
      cd "$INSTALL_DIR"
      git pull origin main 2>/dev/null || git pull 2>/dev/null || true
      log "Repository updated."
    fi
  else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone "$REPO_URL" "$INSTALL_DIR"
    log "Repository cloned to $INSTALL_DIR"
  fi
}

configure_environment() {
  hr
  echo ""
  log "Configuring environment..."

  AUTH_SECRET=$(openssl rand -base64 33 2>/dev/null || head -c 33 /dev/urandom | base64)

  # Frontend .env.local
  cat > "$INSTALL_DIR/promptdev-frontend/.env.local" << EOF
# =============================================================================
# PromptDev Frontend — Auto-generated by installer
# =============================================================================

# NextAuth.js v5
AUTH_SECRET=$AUTH_SECRET

# GitHub OAuth (configure at https://github.com/settings/developers)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Google OAuth (configure at https://console.cloud.google.com/apis/credentials)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Copilot SDK
${GITHUB_TOKEN:+GITHUB_TOKEN=$GITHUB_TOKEN}
EOF

  # Slack bot .env (if configured)
  if [ -n "$SLACK_BOT_TOKEN" ]; then
    cat > "$INSTALL_DIR/promptdev-bot/.env" << EOF
SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN
SLACK_APP_TOKEN=$SLACK_APP_TOKEN
SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET
PROMPTDEV_API_URL=http://localhost:8080/api
EOF
    log "Slack bot environment configured."
  fi

  # Export Bitbucket configuration for this session
  if [ -n "$BITBUCKET_URL" ]; then
    export BITBUCKET_URL BITBUCKET_PROJECT_KEY BITBUCKET_USERNAME BITBUCKET_TOKEN
  fi

  # Export Jira configuration for this session
  if [ -n "$JIRA_URL" ]; then
    export JIRA_URL JIRA_USERNAME JIRA_TOKEN
  fi

  log "Environment configured."
}

install_dependencies() {
  hr
  echo ""
  log "Installing dependencies..."

  cd "$INSTALL_DIR/promptdev-frontend"
  npm install --silent 2>/dev/null
  log "Frontend dependencies installed."

  if [ -n "$SLACK_BOT_TOKEN" ]; then
    cd "$INSTALL_DIR/promptdev-bot"
    npm install --silent 2>/dev/null
    log "Slack bot dependencies installed."
  fi

  cd "$INSTALL_DIR/promptdev-cli"
  npm install --silent 2>/dev/null
  log "CLI dependencies installed."

  cd "$INSTALL_DIR"
}

start_services() {
  hr
  echo ""
  log "Starting services via start-all.sh..."

  cd "$INSTALL_DIR"
  chmod +x start-all.sh

  if [ -n "$SLACK_BOT_TOKEN" ]; then
    export SLACK_BOT_TOKEN SLACK_APP_TOKEN SLACK_SIGNING_SECRET
    exec ./start-all.sh --bot
  else
    exec ./start-all.sh
  fi
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║    PromptDev Installer                ║"
  echo "  ║    AI-Powered Development Platform    ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo -e "${NC}"

  detect_os
  detect_package_manager

  check_prerequisites
  prompt_install_dir
  prompt_slack_config
  prompt_bitbucket_config
  prompt_jira_config
  prompt_github_token

  clone_repository
  configure_environment
  install_dependencies
  start_services
}

main "$@"
