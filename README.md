# PromptDev

**AI-Powered Development Platform** — Build features by describing what you want. The AI agent generates the code and creates pull requests automatically.

---

## What is PromptDev?

PromptDev is a development platform that turns natural language prompts into working code. You describe a feature, select your repository, and an AI agent (powered by GitHub Copilot SDK) writes the code, commits it, and opens a pull request — all from a web UI.

### Key Features

- **Prompt-to-PR workflow** — Describe a feature, get a pull request
- **Jira integration** — Link tasks to Jira issues, update status, add comments with PR links, and auto-create tasks from assigned issues with custom prompts
- **Repository & branch selection** — Pick from your Bitbucket repos and branches
- **Local workspace support** — Work with local project directories or create new projects from scratch
- **Model selection** — Choose from GPT-5.2, Claude Opus 4.5, Gemini 3 Pro, and 14+ models with dynamic model discovery
- **BYOK provider support** — Bring your own key for OpenAI-compatible, Azure, or Anthropic endpoints
- **Slash commands** — Use /model, /review, /fleet, /clear, /help in Copilot chat and Slack
- **Per-user Copilot tokens** — Isolated AI sessions with personal GitHub tokens
- **User authentication** — NextAuth.js v5 with GitHub and Google OAuth providers
- **Encrypted secrets** — AES-256-GCM encryption for all sensitive tokens
- **Iterative sessions** — Agent iterates until all steps complete and tests pass
- **Scheduled jobs** — Recurring maintenance, code review, test coverage, security audits
- **Real-time progress** — Live event streaming via SSE
- **Copilot chat** — Interactive AI assistant for ad-hoc development questions
- **Slack integration** — Create and monitor tasks from Slack
- **CLI tool** — Install, start, stop, and manage PromptDev from the terminal
- **Container support** — Podman Compose and Docker compatible
- **React Compiler** — Automatic memoization via the React Compiler

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│  Spring Boot 4   │────▶│   Bitbucket     │
│   Frontend      │◀────│    Backend       │     │   Server        │
│   :3000         │ SSE │    :8080         │     │   :7990         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │  │
        │                       │  └─────▶┌─────────────────┐
        │                       │        │   Jira Server   │
        │                       ▼        │   :55000        │
        │               ┌──────────────────┐└─────────────────┘
        │               │   PostgreSQL 18  │
        │               │   :5432          │
        │               └──────────────────┘
        ▼
┌─────────────────┐     ┌──────────────────┐
│  Copilot SDK    │     │  Slack Bot       │
│  (AI Sessions)  │     │  :3001 (Socket)  │
└─────────────────┘     └──────────────────┘
```

| Component | Technology                                    | Port |
| --------- | --------------------------------------------- | ---- |
| Frontend  | Next.js 16, React 19, Tailwind CSS, shadcn/ui | 3000 |
| Backend   | Spring Boot 4, Java 21, PostgreSQL            | 8080 |
| Database  | PostgreSQL 18                                 | 5432 |
| Slack Bot | @slack/bolt (Socket Mode)                     | 3001 |
| AI Engine | GitHub Copilot SDK                            | —    |
| VCS       | Bitbucket Server or Local filesystem          | 7990 |
| Issues    | Jira Server (optional)                        | —    |
| Auth      | NextAuth.js v5 (GitHub, Google OAuth)         | —    |

---

## Quick Start

### Prerequisites

| Tool             | Version | Check              | Required?                          |
| ---------------- | ------- | ------------------ | ---------------------------------- |
| Podman or Docker | Latest  | `podman --version` | Yes                                |
| Git              | Latest  | `git --version`    | Yes                                |

For local development (without Docker):

| Tool    | Version | Check              | Required?     |
| ------- | ------- | ------------------ | ------------- |
| Java    | 21+     | `java --version`   | Backend only  |
| Node.js | 25+     | `node --version`   | Frontend/Bot  |
| pnpm    | Latest  | `pnpm --version`   | Frontend/Bot  |

### Deploy (One Command)

```bash
curl -fsSL https://raw.githubusercontent.com/orcunbalcilar/promptdev/main/deploy.sh | bash
```

The deploy script:

1. Clones the repository (if not already in it)
2. Auto-generates `ENCRYPTION_KEY` and `AUTH_SECRET`
3. Walks you through setting up GitHub OAuth, Copilot token, and optional integrations
4. Writes `.env` and starts all containers

Or run it locally after cloning:

```bash
git clone https://github.com/orcunbalcilar/promptdev.git
cd promptdev
./deploy.sh
```

#### Using a Custom Environment File

You can provide an existing `.env` file to skip the interactive setup:

```bash
./deploy.sh --env-file /path/to/custom.env
# or
./deploy.sh -e /path/to/custom.env
```

The script will:

- Load variables from your custom file
- Validate all required keys are present
- Prompt only for missing values
- Auto-generate `ENCRYPTION_KEY` and `AUTH_SECRET` if not provided
- Merge the result back into `.env`

If no `--env-file` is specified, the script looks for `.env` in the current directory.

Open **http://localhost:3000** to access the dashboard.

### Podman Compose (Preferred) or Docker Compose (Manual)

```bash
cp .env.example .env
# Fill in secrets (see deploy.sh for guidance on each value)

# Start core services (database, backend, frontend) — using Podman (preferred)
podman-compose up -d

# Or with Docker (alternative)
docker compose up -d

# Include the Slack bot
podman-compose --profile slack up -d
# Or: docker compose --profile slack up -d

# Tear down
podman-compose down
# Or: docker compose down

# Tear down and delete volumes (database, cache, workspaces)
podman-compose down -v
# Or: docker compose down -v
```

The compose file defines four services: `db`, `backend`, `frontend`, and `bot` (Slack bot, opt-in via the `slack` profile). All images are built locally. All services have health checks; dependents wait for healthy upstreams.

#### Container Architecture

| Service  | Base Image             | Runtime                    | Size (approx.) |
| -------- | ---------------------- | -------------------------- | -------------- |
| Backend  | `debian:bookworm-slim` | GraalVM native executable  | ~90 MB         |
| Frontend | `node:25-alpine`       | Next.js standalone         | ~150 MB        |
| Bot      | `node:25-alpine`       | Node.js                    | ~80 MB         |
| Database | `postgres:18-alpine`   | PostgreSQL                 | ~80 MB         |

> **Note:** The first backend build compiles a GraalVM native image (~15 min, needs ~8 GB RAM). Subsequent builds are cached and much faster.
>
> **Container Runtime:** Podman is preferred for its open-source, daemonless architecture. Docker is also fully supported as an alternative.

#### Persistent Volumes

| Volume | Mounted at | Purpose |
| --- | --- | --- |
| `pgdata` | `/var/lib/postgresql/data` | PostgreSQL database files |
| `nextjs-cache` | `/app/.next/cache` | Next.js ISR / component cache (survives restarts) |
| `workspace-data` | `/data/workspaces` | Backend workspace files (task repos, generated code) |

### Podman

Compatible with `podman-compose`. The deploy script auto-detects Podman.

```bash
podman-compose up -d
```

### Manual Start (step by step)

#### 1. Start PostgreSQL

```bash
# Using Podman (preferred)
podman run -d \
  --name promptdev-db \
  -e POSTGRES_DB=promptdev \
  -e POSTGRES_USER=promptdev \
  -e POSTGRES_PASSWORD=promptdev \
  -p 5432:5432 \
  postgres:17-alpine

# Or with Docker:
# docker run -d \
#   --name promptdev-db \
#   -e POSTGRES_DB=promptdev \
#   -e POSTGRES_USER=promptdev \
#   -e POSTGRES_PASSWORD=promptdev \
#   -p 5432:5432 \
#   postgres:17-alpine
```

#### 2. Start Backend

```bash
cd promptdev-backend

export DB_URL="jdbc:postgresql://localhost:5432/promptdev"
export DB_USERNAME="promptdev"
export DB_PASSWORD="promptdev"
export JPA_DDL_AUTO="update"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"

./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080/api`.

#### 3. Start Frontend

```bash
cd promptdev-frontend
pnpm install
pnpm dev
```

The UI will be available at `http://localhost:3000`.

#### 4. Start Slack Bot (optional)

```bash
cd promptdev-bot
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_APP_TOKEN=xapp-...
export SLACK_SIGNING_SECRET=...
pnpm install
pnpm dev
```

---

## Configuration

### Environment Variables

The application ships with **zero development defaults** — all environment-specific values must be provided externally. The `deploy.sh` script and `docker-compose.yml` supply development values automatically.

#### Loading Environment Files

Both the `deploy.sh` script and the `promptdev` CLI support loading environment variables from custom `.env` files:

```bash
# Deploy script
./deploy.sh --env-file /path/to/custom.env

# CLI
promptdev start --env-file ./production.env
```

**Behavior:**

- Loads all key-value pairs from the specified file
- Validates that required variables are present
- Prompts for any missing values interactively
- Auto-generates security keys (`ENCRYPTION_KEY`, `AUTH_SECRET`) if not provided
- Preserves any extra variables not in the required set
- Saves the merged configuration to `.env`

**Docker Compose precedence** (highest to lowest):

1. Environment variables set in your shell
2. Variables from `--env-file` passed to `docker compose`
3. Variables defined in `docker-compose.yml` (default: `.env`)
4. Default values in Dockerfiles

If no `--env-file` is specified, both tools default to `.env` in the project root directory.

#### Backend (required)

| Variable         | Description                        | Development value (injected by deploy.sh)             |
| ---------------- | ---------------------------------- | ----------------------------------------------------- |
| `DB_URL`         | JDBC connection string             | `jdbc:postgresql://localhost:5432/promptdev`      |
| `DB_USERNAME`    | PostgreSQL username                | `promptdev`                                           |
| `DB_PASSWORD`    | PostgreSQL password                | `promptdev`                                           |
| `JPA_DDL_AUTO`   | Hibernate DDL strategy             | `update` (production should use `validate` or `none`) |
| `ENCRYPTION_KEY` | AES-256 key for encrypting secrets | Auto-generated by deploy.sh                           |

#### Backend (optional)

| Variable                | Description                     |
| ----------------------- | ------------------------------- |
| `LOG_LEVEL`             | Application log level           |
| `SERVER_PORT`           | Server port (default: `8080`)   |
| `BITBUCKET_URL`         | Bitbucket Server URL            |
| `BITBUCKET_USERNAME`    | Bitbucket username              |
| `BITBUCKET_TOKEN`       | Bitbucket personal access token |

| Variable                | Description                     |
| ----------------------- | ------------------------------- |
| `JIRA_URL`              | Jira Server URL                 |
| `JIRA_USERNAME`         | Jira username                   |
| `JIRA_TOKEN`            | Jira personal access token      |

#### Frontend (`promptdev-frontend/.env.local`)

| Variable              | Description                                 |
| --------------------- | ------------------------------------------- |
| `NEXTAUTH_URL`        | Public URL (e.g., `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Backend API URL                             |
| `AUTH_SECRET`         | NextAuth.js session secret                  |
| `AUTH_GITHUB_ID`      | GitHub OAuth client ID                      |
| `AUTH_GITHUB_SECRET`  | GitHub OAuth client secret                  |
| `AUTH_GOOGLE_ID`      | Google OAuth client ID                      |
| `AUTH_GOOGLE_SECRET`  | Google OAuth client secret                  |
| `GITHUB_TOKEN`        | Shared Copilot SDK token                    |

#### Slack Bot (`promptdev-bot/.env`)

| Variable               | Description                               |
| ---------------------- | ----------------------------------------- |
| `SLACK_BOT_TOKEN`      | Bot User OAuth Token (`xoxb-...`)         |
| `SLACK_APP_TOKEN`      | App-Level Token (`xapp-...`, Socket Mode) |
| `SLACK_SIGNING_SECRET` | Signing Secret (from Basic Information)   |
| `PROMPTDEV_API_URL`    | Backend API URL                           |

### Authentication

PromptDev uses **NextAuth.js v5** for user authentication with GitHub and Google OAuth providers.

1. **GitHub OAuth App**: [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`

2. **Google OAuth**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

3. Set the credentials in `promptdev-frontend/.env.local`.

### User Settings

After signing in, navigate to **Settings** to configure:

- **Bitbucket Configuration** — Server URL, project key, username, and personal access token
- **Jira Configuration** — Server URL, project key, username, personal access token, and auto-task creation settings (custom prompt, iterative mode, max iterations, code review)
- **GitHub Copilot Token** — Personal GitHub token for isolated Copilot sessions (`gho_`, `ghu_`, `github_pat_`)
- **BYOK Provider** — OpenAI-compatible, Azure, or Anthropic endpoint with your own API key

All sensitive tokens are encrypted with **AES-256-GCM** before storage and are never returned in API responses.

---

## How to Use

### Creating a Task

1. Open **http://localhost:3000**
2. Click **"New Task"**
3. Fill in the form: title, prompt, workspace type, repository, branches, AI model, iterative toggle
4. Click **"Create Task"**

The task appears on the Kanban board. Click it to watch real-time progress.

### Iterative Sessions

Enable **Iterative Session** for complex, multi-step tasks. The agent works in multiple cycles, checking progress after each iteration until completion criteria are met.

### Scheduled Jobs

Navigate to **Scheduled Jobs** to set up recurring tasks: maintenance, code review, test coverage, security audits, performance checks, documentation updates, or custom jobs with cron scheduling.

### Copilot Chat

Click **"Copilot Agent"** for an interactive AI chat with slash commands:

| Command                   | Description                   |
| ------------------------- | ----------------------------- |
| `/model <id>`             | Switch to a specific AI model |
| `/review <repo> [branch]` | Start an AI code review       |
| `/fleet`                  | Show task fleet status        |
| `/clear`                  | Start a new chat session      |
| `/help`                   | List all available commands   |

### Monitoring

Click **"Monitoring"** to see system health, active tasks, and service status.

---

## Slack Bot

The `promptdev-bot` package enables task management from Slack via Socket Mode.

### Setup

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable **Socket Mode** → generate an App-Level Token with `connections:write` scope
3. Add a **Slash Command**: `/pd`
4. Add Bot Token Scopes: `commands`, `chat:write`, `connections:write`
5. **Install the app** to your workspace
6. Set environment variables (`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`)
7. Start the bot: `docker compose --profile slack up -d`

### Slack Commands

| Command                      | Description                   |
| ---------------------------- | ----------------------------- |
| `/pd help`                   | Show available commands       |
| `/pd create <repo> <prompt>` | Create a new task             |
| `/pd start <task-id>`        | Start a task                  |
| `/pd status [task-id]`       | Check task or list all active |
| `/pd list`                   | List recent tasks             |
| `/pd cancel <task-id>`       | Cancel a running task         |
| `/pd model [model-id]`       | View/set the AI model         |
| `/pd review <repo> [branch]` | Start an AI code review       |
| `/pd fleet`                  | Show fleet status overview    |

---

## CLI Tool

```bash
cd promptdev-cli
pnpm install
pnpm link --global    # Makes 'promptdev' command available globally
```

| Command                      | Description                  |
| ---------------------------- | ---------------------------- |
| `promptdev install`          | Clone and set up the project |
| `promptdev start`            | Start all services           |
| `promptdev start -s backend` | Start only backend           |
| `promptdev stop`             | Stop all services            |
| `promptdev status`           | Check service status         |
| `promptdev update`           | Pull latest and rebuild      |
| `promptdev config --show`    | Show current config          |

### Using Environment Files with CLI

The `promptdev start` and `promptdev install` commands support the `--env-file` flag:

```bash
promptdev install --env-file /path/to/custom.env
promptdev start --env-file ./production.env
```

The CLI will:

- Load variables from the specified file
- Validate required environment keys
- Prompt for any missing values
- Generate `ENCRYPTION_KEY` and `AUTH_SECRET` if not present
- Save the complete configuration to `.env`

If `--env-file` is not specified, the CLI looks for `.env` in the repository root directory.

---

## API Reference

### Tasks

| Method | Endpoint                    | Description                |
| ------ | --------------------------- | -------------------------- |
| `POST` | `/api/tasks`                | Create a new task          |
| `GET`  | `/api/tasks`                | List all tasks (paginated) |
| `GET`  | `/api/tasks/{id}`           | Get task details           |
| `GET`  | `/api/tasks/{id}/events`    | Get task events            |
| `POST` | `/api/tasks/{id}/start`     | Start task processing      |
| `POST` | `/api/tasks/{id}/cancel`    | Cancel a task              |
| `POST` | `/api/tasks/{id}/retry`     | Retry a failed task        |
| `POST` | `/api/tasks/{id}/create-pr` | Create a pull request      |

### Scheduled Jobs

| Method   | Endpoint                          | Description            |
| -------- | --------------------------------- | ---------------------- |
| `POST`   | `/api/scheduled-jobs`             | Create a scheduled job |
| `GET`    | `/api/scheduled-jobs`             | List all jobs          |
| `GET`    | `/api/scheduled-jobs/{id}`        | Get job details        |
| `POST`   | `/api/scheduled-jobs/{id}/toggle` | Enable/disable a job   |
| `DELETE` | `/api/scheduled-jobs/{id}`        | Delete a job           |

### Repositories

| Method | Endpoint                            | Description                 |
| ------ | ----------------------------------- | --------------------------- |
| `GET`  | `/api/repositories`                 | List Bitbucket repositories |
| `GET`  | `/api/repositories/{slug}/branches` | List branches               |

### Jira

| Method | Endpoint                                    | Description              |
| ------ | ------------------------------------------- | ------------------------ |
| `GET`  | `/api/jira/issues/search?jql=...`           | Search issues (JQL)      |
| `GET`  | `/api/jira/issues/{issueKey}`               | Get issue details        |
| `GET`  | `/api/jira/issues/{issueKey}/transitions`   | Get available transitions|
| `POST` | `/api/jira/issues/{issueKey}/transition`    | Transition issue status  |
| `POST` | `/api/jira/issues/{issueKey}/comment`       | Add comment to issue     |
| `PUT`  | `/api/jira/issues/{issueKey}/assign`        | Assign issue to user     |
| `GET`  | `/api/jira/projects/{projectKey}/issues`    | Get project issues       |
| `GET`  | `/api/jira/users/{username}/issues`         | Get assigned issues      |

### Users

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| `GET`  | `/api/users/{id}/profile`  | Get user profile            |
| `PUT`  | `/api/users/{id}/settings` | Update user settings        |
| `POST` | `/api/users/sync`          | Find or create user (OAuth) |

### SSE (Real-time)

| Method | Endpoint                 | Description                   |
| ------ | ------------------------ | ----------------------------- |
| `GET`  | `/api/stream/tasks`      | Subscribe to all task updates |
| `GET`  | `/api/stream/tasks/{id}` | Subscribe to a specific task  |
| `POST` | `/api/stream/callback`   | Agent callback endpoint       |

---

## Project Structure

```
promptdev/                          ← monorepo root
├── docker-compose.yml              # Full-stack container orchestration
├── deploy.sh                       # One-command deploy (curl | bash)
├── .env.example                    # Environment variable template
├── README.md
├── PROJECT_SNAPSHOT.md
│
├── promptdev-backend/              # Spring Boot 4 API server
│   ├── Dockerfile                  # GraalVM native image
│   ├── pom.xml
│   └── src/main/java/com/promptdev/
│       ├── config/                 # Security, SSE, Bitbucket, Jira, Scheduler
│       ├── controller/             # REST controllers
│       ├── dto/                    # Request/Response DTOs
│       ├── entity/                 # JPA entities
│       ├── mapper/                 # Entity-to-DTO mappers
│       ├── repository/             # Spring Data JPA repositories
│       ├── service/                # Business logic
│       └── util/                   # EncryptionUtil (AES-256-GCM)
│
├── promptdev-frontend/             # Next.js 16 web application
│   ├── Dockerfile
│   ├── auth.ts                     # NextAuth.js v5 configuration
│   ├── proxy.ts                    # Route protection
│   ├── app/                        # Pages
│   ├── components/                 # React components
│   ├── hooks/                      # Custom React hooks
│   └── lib/                        # API client, Copilot integration
│
├── promptdev-bot/                  # Slack bot (Socket Mode)
│   ├── Dockerfile
│   └── src/                        # Bot commands, actions, messages
│
└── promptdev-cli/                  # CLI management tool
    └── src/commands/               # install, start, stop, status, update, config
```

---

## Development

### Backend

```bash
cd promptdev-backend

# Run with dev environment (requires DB_URL, DB_USERNAME, DB_PASSWORD)
./mvnw spring-boot:run

# Run tests (uses in-memory H2, no external database needed)
./mvnw test

# Compile only
./mvnw clean compile
```

### Frontend

```bash
cd promptdev-frontend
pnpm dev             # Development server with hot reload
pnpm build           # Production build
pnpm test            # Unit tests (Vitest)
pnpm test:e2e        # E2E tests (Playwright — run pnpm exec playwright install once)
pnpm lint            # ESLint
```

### Slack Bot

```bash
cd promptdev-bot
pnpm dev             # Development with watch mode
pnpm build           # TypeScript build
pnpm start           # Production start
```

### Database

PostgreSQL is the only supported database. Tables are managed by Spring JPA with the DDL strategy controlled by the `JPA_DDL_AUTO` environment variable:

| Value      | Use case                                                  |
| ---------- | --------------------------------------------------------- |
| `update`   | Development — auto-creates and migrates tables on startup |
| `validate` | Production — validates schema but never modifies it       |
| `none`     | Production — disables all DDL management                  |

The `docker-compose.yml` sets `JPA_DDL_AUTO=update` for development. The application default (without any script) is `validate`.

To reset the development database:

```bash
docker stop promptdev-db && docker rm promptdev-db
# Then re-deploy: ./deploy.sh
```

---

## Installation Guide

### macOS

```bash
brew install openjdk@21 docker
# Start Docker Desktop from Applications
git clone https://github.com/orcunbalcilar/promptdev.git
cd promptdev
./deploy.sh
```

### Windows

```powershell
# Install with winget (Windows 11+)
winget install EclipseAdoptium.Temurin.21.JDK
winget install Git.Git
winget install Docker.DockerDesktop

# Clone and deploy
git clone https://github.com/orcunbalcilar/promptdev.git
cd promptdev
./deploy.sh
```

### Linux

```bash
# Debian/Ubuntu
sudo apt-get install openjdk-21-jdk docker.io git

# Fedora/RHEL
sudo dnf install java-21-openjdk docker git

git clone https://github.com/orcunbalcilar/promptdev.git
cd promptdev
./deploy.sh
```

---

## Technology Stack

| Layer            | Technology           | Version |
| ---------------- | -------------------- | ------- |
| Frontend         | Next.js              | 16.1.6  |
| UI Framework     | React                | 19.2.4  |
| Styling          | Tailwind CSS         | 4.x     |
| UI Components    | shadcn/ui            | Latest  |
| State Management | TanStack React Query | 5.x     |
| Authentication   | NextAuth.js          | v5 beta |
| Backend          | Spring Boot          | 4.0.2   |
| Language         | Java                 | 21      |
| Native Runtime   | GraalVM Native Image | 21      |
| Database         | PostgreSQL           | 18      |
| Encryption       | AES-256-GCM          | —       |
| AI SDK           | GitHub Copilot SDK   | 0.1.24  |
| Package Manager  | pnpm                 | Latest  |
| CLI              | Commander.js         | Latest  |
| Slack Bot        | @slack/bolt          | Latest  |
| Testing (Unit)   | Vitest               | 4.0.18  |
| Testing (E2E)    | Playwright           | Latest  |
| React Compiler   | babel-plugin         | Latest  |
| Containers       | Docker / Podman      | Latest  |

---

## AI Models

Available models (configurable per task or via `/model` command):

| Model             | Provider  | Best For                |
| ----------------- | --------- | ----------------------- |
| GPT-5.2           | OpenAI    | Complex reasoning tasks |
| GPT-5.2-Codex     | OpenAI    | Code generation         |
| o3                | OpenAI    | Advanced reasoning      |
| o3-mini           | OpenAI    | Fast reasoning          |
| GPT-5 mini        | OpenAI    | Everyday tasks          |
| Claude Sonnet 4.5 | Anthropic | Balanced coding tasks   |
| Claude Opus 4.5   | Anthropic | Highly complex tasks    |
| Claude Haiku 3.5  | Anthropic | Fast, lightweight tasks |
| Gemini 3 Pro      | Google    | Large context tasks     |
| Gemini 3 Flash    | Google    | Fast, simple tasks      |
| Gemini 2.5 Pro    | Google    | Advanced reasoning      |
| Gemini 2.5 Flash  | Google    | Quick responses         |
| Grok Code Fast 1  | xAI       | Quick code edits        |
| Codestral Latest  | Mistral   | Code-focused tasks      |

Models are also fetched dynamically from the Copilot SDK at runtime. When a BYOK provider is configured in Settings, users can access any model available at their custom endpoint.

---

## License

Internal use only. All rights reserved.
