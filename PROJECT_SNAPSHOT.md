# PromptDev Project Snapshot

> Updated: February 2026
> Purpose: Continue development in a new chat session

## Project Goal

Build an AI-powered development platform where users describe features via prompts, and an AI agent (GitHub Copilot SDK) generates code and creates Bitbucket pull requests.

**Completion Criteria**: A prompt on the UI triggers a Copilot SDK agent session that produces a successful Bitbucket PR.

---

## Architecture

```text
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

## Technology Stack

| Layer            | Technology           | Version |
| ---------------- | -------------------- | ------- |
| Frontend         | Next.js              | 16.1.6  |
| UI               | React 19 + shadcn/ui | 19.2.4  |
| Authentication   | NextAuth.js          | v5 beta |
| Backend          | Spring Boot          | 4.0.2   |
| Backend Language | Java                 | 21      |
| Native Runtime   | GraalVM Native Image | 21      |
| Database         | PostgreSQL           | 18      |
| Encryption       | AES-256-GCM          | —       |
| AI Engine        | Copilot SDK          | 0.1.24  |
| VCS              | Bitbucket / Local    | —       |
| Issues           | Jira Server          | —       |
| Testing          | Vitest + Playwright  | 4.0.18  |
| Package Manager  | pnpm                 | Latest  |
| React Compiler   | babel-plugin         | Latest  |
| CLI              | Commander.js         | Latest  |
| Slack Bot        | @slack/bolt          | Latest  |
| Containers       | Podman / Docker      | Latest  |

## Repository Structure

**Monorepo** — single Git repository at `https://github.com/orcunbalcilar/promptdev.git` containing all four modules:

| Module               | Language   | Description        |
| -------------------- | ---------- | ------------------ |
| `promptdev-backend`  | Java 21    | Spring Boot API    |
| `promptdev-frontend` | TypeScript | Next.js 16 web app |
| `promptdev-bot`      | TypeScript | Slack bot          |
| `promptdev-cli`      | TypeScript | CLI tool           |

---

## Completed Features

### Backend

- Task CRUD with workspace types (LOCAL / BITBUCKET)
- Model selection (14+ models) with dynamic discovery
- BYOK provider support (OpenAI-compatible, Azure, Anthropic) with AES-256-GCM encrypted API keys
- Iterative sessions (multi-iteration, self-referential AI loops with completion criteria)
- Scheduled jobs (7 types with cron scheduling)
- SSE streaming for real-time task progress
- Agent callback endpoint
- Bitbucket integration (repo listing, branch listing, PR creation)
- Jira Server integration (issue search, transitions, comments, assignments — conditional on config, auto-task creation enabled by default, commit message patterns enforced with Jira ID)
- Event tracking (30 operation types)
- User management with OAuth provider sync (GitHub, Google)
- User settings API (profile, Bitbucket config, Copilot token)
- Encrypted secrets (AES-256-GCM for all tokens)

### Frontend

- Kanban dashboard with task cards (refined UI with colored column borders, gradient header, Glass effect)
- Create task dialog (repo dropdown, branch selectors, model picker, iterative toggle)
- Agent Skills powered by skills.sh ecosystem (12 curated skills from vercel-labs/agent-skills, anthropics/skills, etc. installed via `npx skills add`, click-to-select UI with install counts, deduped install commands in boot script)
- Task detail page with real-time event log (optimistic SSE updates, no redundant polling)
- Scheduled jobs page (CRUD, cron presets, job type icons, SDLC template suggestions as collapsible prompts)
- Copilot chat page (interactive AI assistant with model/reasoning settings)
- Monitoring page (system health dashboard)
- Authentication (NextAuth.js v5 with GitHub and Google OAuth)
- Login page, Settings page (Bitbucket, Jira, Copilot token, BYOK provider)
- Route protection (proxy.ts)
- Per-user Copilot tokens for session isolation
- Copilot slash commands (/model, /review, /fleet, /clear, /help)
- React Compiler (automatic memoization)
- E2E tests (Playwright)

### Slack Bot

- /pd slash commands: help, create, start, status, list, cancel, model, review, fleet
- Interactive actions (button clicks for start/cancel)
- Socket Mode (no public URL needed)
- Monitoring integration

### CLI

- Commands: install, start, stop, status, update, config

### Infrastructure

- **Monorepo** — single Git repository for all modules
- **Podman Compose** — full-stack container orchestration (PostgreSQL, backend, frontend, bot)
- **GraalVM native image** — backend compiled to native executable (instant startup, low memory)
- **Lightweight images** — `debian:bookworm-slim` (backend native), `node:alpine` (frontend/bot)
- **Persistent volumes** — `pgdata` (database), `nextjs-cache` (ISR/component cache), `workspace-data` (task repos)
- **Non-root containers** — all services run as non-root users
- **Health checks** — all services have container health checks with start period
- **Podman support** — all container features work with both Docker and Podman
- **One-command deploy** — `deploy.sh` (curl | bash interactive wizard)
- **Auto-generated secrets** — `deploy.sh` generates `ENCRYPTION_KEY` and `AUTH_SECRET` automatically
- **Token-only auth** — Bitbucket and Jira use personal access tokens (no passwords)
- **pnpm** — all Node.js subprojects use pnpm for faster, efficient builds

---

## Key Design Decisions

### No hardcoded development defaults

The `application.yml` file uses only environment variable references without default values for all database and environment-specific configuration. This ensures:

- The repository is safe to distribute publicly on GitHub
- Production deployments cannot accidentally use development credentials
- All development values are explicitly documented in `start-all` scripts

### PostgreSQL only

PostgreSQL is the only supported database. Tests use an in-memory H2 database via `application-test.yml`. There is no H2 fallback for runtime.

### Container profiles

The Slack bot is an optional service in `docker-compose.yml`. Use `--profile slack` to include it. Core services (db, backend, frontend) start without any profile flag.

---

## Key Entities

### Task

- Fields: id, title, prompt, repositorySlug, workspaceType (LOCAL/BITBUCKET), workspacePath, sourceBranch, targetBranch, status (12 states), modelId, copilotSessionId, iterative, maxIterations, currentIteration, completionCriteria, steps, currentStepIndex, scheduledJobId, pullRequestId/Url, errorMessage, timestamps

### ScheduledJob

- Fields: id, name, description, cronExpression, promptTemplate, jobType (7 types), workspaceType, workspaceRef, sourceBranch, targetBranch, modelId, enabled, maxIterations, lastRunAt, nextRunAt, lastTaskId, timestamps

### User

- Fields: id, provider (github/google), providerAccountId, email, name, avatarUrl, bitbucketUrl, bitbucketProjectKey, bitbucketUsername, bitbucketTokenEncrypted, copilotTokenEncrypted, byokProviderType, byokBaseUrl, byokApiKeyEncrypted, jiraUrl, jiraProjectKey, jiraUsername, jiraTokenEncrypted, jiraAutoTaskEnabled (default: true), timestamps

---

## API Endpoints

| Method | Endpoint                           | Description              |
| ------ | ---------------------------------- | ------------------------ |
| POST   | /api/tasks                         | Create task              |
| GET    | /api/tasks                         | List tasks (paginated)   |
| GET    | /api/tasks/{id}                    | Get task                 |
| GET    | /api/tasks/{id}/events             | Get task events          |
| POST   | /api/tasks/{id}/start              | Start task               |
| POST   | /api/tasks/{id}/cancel             | Cancel task              |
| POST   | /api/tasks/{id}/retry              | Retry task               |
| POST   | /api/tasks/{id}/create-pr          | Create PR                |
| GET    | /api/repositories                  | List repos               |
| GET    | /api/repositories/{slug}/branches  | List branches            |
| GET    | /api/jira/issues/search            | Search Jira issues (JQL) |
| GET    | /api/jira/issues/{issueKey}        | Get Jira issue           |
| GET    | /api/jira/issues/{key}/transitions | Get transitions          |
| POST   | /api/jira/issues/{key}/transition  | Transition issue         |
| POST   | /api/jira/issues/{key}/comment     | Add comment              |
| PUT    | /api/jira/issues/{key}/assign      | Assign issue             |
| GET    | /api/jira/projects/{key}/issues    | Get project issues       |
| GET    | /api/jira/users/{name}/issues      | Get assigned issues      |
| GET    | /api/stream/tasks                  | SSE: all tasks           |
| GET    | /api/stream/tasks/{id}             | SSE: specific task       |
| POST   | /api/stream/callback               | Agent callback           |
| POST   | /api/scheduled-jobs                | Create job               |
| GET    | /api/scheduled-jobs                | List jobs                |
| GET    | /api/scheduled-jobs/{id}           | Get job                  |
| POST   | /api/scheduled-jobs/{id}/toggle    | Toggle job               |
| DELETE | /api/scheduled-jobs/{id}           | Delete job               |
| GET    | /api/users/{id}/profile            | Get user profile         |
| PUT    | /api/users/{id}/settings           | Update user settings     |
| POST   | /api/users/sync                    | Find/create user         |

---

## Resume Prompt

> Continue building the PromptDev project. Read PROJECT_SNAPSHOT.md and README.md for full context.
>
> Completed: Backend (tasks, scheduled jobs, workspace types, model selection with 14+ models and dynamic discovery, iterative sessions, user management with encrypted secrets, BYOK provider support, Jira integration), Frontend (dashboard, task dialog with selectors and local project creation, task detail, scheduled jobs page, copilot chat with slash commands, authentication with NextAuth.js v5, settings page with BYOK and Jira config, login page, React Compiler), CLI, Slack bot (with /model, /review, /fleet commands), Docker Compose, Podman support, monorepo structure, one-command deploy, Playwright E2E tests.
>
> Middleware migrated to proxy.ts (Next.js 16 pattern). All Dockerfiles updated to Java 21 and Node 25. Per-user Copilot tokens and BYOK providers supported for session isolation. Application ships with zero development defaults — all env-specific config injected by deploy.sh or docker-compose.yml. All Node.js subprojects use pnpm. Bitbucket and Jira use token-only auth (no passwords).
