# PromptDev Project Snapshot

> Updated: July 2026
> Purpose: Continue development in a new chat session

## Project Goal

Build an AI-powered development platform where users describe features via prompts, and an AI agent (GitHub Copilot SDK) generates code and creates Bitbucket pull requests.

**Completion Criteria**: A prompt on the UI triggers a Copilot SDK agent session that produces a successful Bitbucket PR.

---

## Architecture

```text
┌──────────────────────────────────────┐     ┌─────────────────┐
│          Next.js 16                  │────▶│   Bitbucket     │
│  (Full-stack: UI + API + Services)   │     │   Server        │
│             :3000                    │     │   :7990         │
│                                      │     └─────────────────┘
│  ┌─────────┐  ┌──────────────────┐   │
│  │  React  │  │   API Routes     │   │────▶┌─────────────────┐
│  │   UI    │  │  (49 endpoints)  │   │     │   Jira Server   │
│  └─────────┘  └──────────────────┘   │     │   :55000        │
│                    │                 │     └─────────────────┘
│            ┌───────▼────────┐        │
│            │  Service Layer │        │
│            │  (Drizzle ORM) │        │
│            └───────┬────────┘        │
└────────────────────┼─────────────────┘
                     │
              ┌──────▼─────────┐
              │  PostgreSQL 18 │
              │     :5432      │
              └────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  Copilot SDK    │     │  Slack Bot       │
│  (AI Sessions)  │     │  :3001 (Socket)  │
└─────────────────┘     └──────────────────┘
```

> **Note:** The Spring Boot backend was eliminated. All server-side logic now lives inside Next.js as API routes + a TypeScript service layer using Drizzle ORM for direct PostgreSQL access.

## Technology Stack

| Layer            | Technology           | Version |
| ---------------- | -------------------- | ------- |
| Full-stack       | Next.js              | 16.1.6  |
| UI               | React 19 + shadcn/ui | 19.2.4  |
| Authentication   | NextAuth.js          | v5 beta |
| ORM              | Drizzle ORM          | 0.45.1  |
| DB Driver        | postgres (node)      | 3.4.8   |
| Database         | PostgreSQL           | 18      |
| Encryption       | AES-256-GCM (node:crypto) | —  |
| AI Engine        | Copilot SDK          | 0.1.24  |
| VCS              | Bitbucket / Local    | —       |
| Issues           | Jira Server          | —       |
| Schema Validation| Zod                  | 4.3.6   |
| Theming          | next-themes          | 0.4.6   |
| Testing          | Vitest + Playwright  | 4.0.18  |
| Package Manager  | pnpm                 | Latest  |
| React Compiler   | babel-plugin         | Latest  |
| CLI              | Commander.js         | Latest  |
| Slack Bot        | @slack/bolt          | Latest  |
| Containers       | Podman / Docker      | Latest  |

## Repository Structure

**Monorepo** — single Git repository at `https://github.com/orcunbalcilar/promptdev.git` containing three modules:

| Module               | Language   | Description                              |
| -------------------- | ---------- | ---------------------------------------- |
| `promptdev-ui`  | TypeScript | Next.js 16 full-stack app (UI + API)    |
| `promptdev-bot`      | TypeScript | Slack bot                                |
| `promptdev-cli`      | TypeScript | CLI tool                                 |

---

## Completed Features

### Server-Side (Next.js API Routes + Service Layer)

- Task CRUD with workspace types (LOCAL / BITBUCKET)
- Task partial update (PATCH) for Jira task refinement before start
- Task cloning for retry flow (creates fresh task from existing config)
- Git worktree support for LOCAL workspaces with existing projects
- Incremented workspace folder naming for LOCAL new project retries
- Model selection (14+ models) with dynamic discovery
- BYOK provider support (OpenAI-compatible, Azure, Anthropic) with AES-256-GCM encrypted API keys
- Iterative sessions (multi-iteration, self-referential AI loops with completion criteria)
- Scheduled jobs (7 types with cron scheduling)
- SSE streaming for real-time task progress (EventEmitter-based)
- Agent callback endpoint
- Bitbucket integration (direct REST API — repo listing, branch listing, PR creation)
- Jira Server integration (direct REST API — issue search, transitions, comments, assignments — conditional on config, auto-task creation enabled by default, commit message patterns enforced with Jira ID, opt-out mechanism for cancelled tasks)
- Event tracking (30 operation types)
- User management with OAuth provider sync (GitHub, Google)
- User settings API (profile, Bitbucket config, Copilot token)
- Encrypted secrets (AES-256-GCM via node:crypto for all tokens)
- Direct PostgreSQL access via Drizzle ORM (no Java backend)
- 49 API route handlers covering all endpoints
- Copilot SDK deep integration: defineTool with zod schemas, session hooks (5 types), infinite sessions with compaction, user input requests
- Code review as fix & validate paradigm (not read-only suggestions)
- 9 TypeScript service modules with 135 unit tests

### Frontend UI

- Kanban dashboard with task cards (refined UI with colored column borders, gradient header, Glass effect)
- Create task dialog (repo dropdown, branch selectors, model picker, iterative toggle, SDLC template picker with category filters)
- Agent Skills powered by skills.sh ecosystem (12 curated skills from vercel-labs/agent-skills, anthropics/skills, etc. installed via `npx skills add`, click-to-select UI with install counts, deduped install commands in boot script)
- Task detail page with real-time event log (optimistic SSE updates, no redundant polling)
- Jira task refinement form (edit title, prompt, model, etc. before starting Jira-originated tasks)
- Scheduled jobs page (CRUD, cron presets, job type icons, SDLC template suggestions as collapsible prompts)
- Copilot chat page (interactive AI assistant with model/reasoning settings, session history sidebar, token usage tracking, conversation export/copy, quick prompts, slash commands)
- Monitoring page (developer-focused analytics dashboard with cost estimation, performance metrics, time-range filtering, daily operations/operations by type/sessions by model/top tools charts, session/error/review tabs, auto-refresh)
- Authentication (NextAuth.js v5 with GitHub and Google OAuth)
- Login page, Settings page (Bitbucket, Jira, Copilot token, BYOK provider)
- Route protection (proxy.ts)
- Per-user Copilot tokens for session isolation
- Copilot slash commands (/model, /review, /fleet, /clear, /help)
- Dark mode / light mode / system theme toggle (next-themes)
- Snow particle effect toggle (with localStorage persistence)
- Custom SVG favicon (code brackets icon)
- Bounded-height scrollable Kanban board (no endless vertical growth)
- Auto-expanding file change details with larger diff views
- Model selector graceful empty state handling
- React Compiler (automatic memoization)
- 72 test files with 920 unit tests
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
- **Podman Compose** — full-stack container orchestration (PostgreSQL, frontend, bot)
- **Lightweight images** — `node:25-alpine` (frontend/bot), `postgres:18-alpine` (db)
- **Persistent volumes** — `pgdata` (database), `nextjs-cache` (ISR/component cache), `workspace-data` (task repos)
- **Non-root containers** — all services run as non-root users
- **Health checks** — all services have container health checks with start period
- **Podman support** — all container features work with both Docker and Podman
- **One-command deploy** — `deploy.sh` (curl | bash interactive wizard)
- **Auto-generated secrets** — `deploy.sh` generates `ENCRYPTION_KEY` and `AUTH_SECRET` automatically
- **Token-only auth** — Bitbucket and Jira use personal access tokens (no passwords)
- **pnpm** — all Node.js subprojects use pnpm for faster, efficient builds
- **Two-tier architecture** — Next.js connects directly to PostgreSQL via Drizzle ORM (no Spring Boot backend)

---

## Key Design Decisions

### Two-tier architecture (no separate backend)

All server-side logic runs inside Next.js as API route handlers + a service layer. The Spring Boot backend was eliminated to remove:
- Inter-service sync issues between frontend and backend
- Java/Maven build complexity and GraalVM native image compilation
- Port management (no more :8080)
- Duplicate deployment concerns

Database access uses Drizzle ORM with a lazy-initialized connection pool (deferred until first request to avoid build-time failures when `DATABASE_URL` is not set).

### No hardcoded development defaults

The `application.yml` file uses only environment variable references without default values for all database and environment-specific configuration. This ensures:

- The repository is safe to distribute publicly on GitHub
- Production deployments cannot accidentally use development credentials
- All development values are explicitly documented in `start-all` scripts

### PostgreSQL only

PostgreSQL is the only supported database. Schema is defined in TypeScript via Drizzle ORM (`lib/db/schema.ts`). Database migrations are managed by Drizzle Kit. Tests mock the database layer — no test database required.

### Container profiles

The Slack bot is an optional service in `docker-compose.yml`. Use `--profile slack` to include it. Core services (db, backend, frontend) start without any profile flag.

---

## Key Entities

### Task Start Behaviors

Tasks have three distinct start behaviors based on their origin:

1. **Regular tasks** (created via UI or Slack bot): Auto-start immediately after creation. The frontend calls `startTask()` right after `createTask()`.
2. **Jira tasks** (created via Jira polling with `jiraIssueKey`): Remain in PENDING status. The user can review and refine task details (title, prompt, model, etc.) via the TaskRefineForm before explicitly starting. The frontend provides a PATCH `/tasks/{id}` endpoint for updating task fields.
3. **Scheduled job tasks** (created via cron scheduler with `scheduledJobId`): Auto-start immediately. The backend's `ScheduledJobService.executeDueJobs()` creates the task and sets it to QUEUED. The frontend's scheduled-task-executor poller detects QUEUED tasks with `scheduledJobId` and triggers execution via the Copilot SDK orchestrator.

### Task

- Fields: id, title, prompt, repositorySlug, workspaceType (LOCAL/BITBUCKET), workspacePath, sourceBranch, targetBranch, status (14 states), modelId, copilotSessionId, iterative, maxIterations, currentIteration, completionCriteria, steps, currentStepIndex, scheduledJobId, jiraIssueKey, user (FK), pullRequestId/Url, errorMessage, timestamps
- Retry behavior: Clones the task (new ID, fresh state) instead of restarting in-place. For Bitbucket: auto-generates new branch. For LOCAL existing projects: git worktrees isolate each task. For LOCAL new projects: increments folder name (my-project, my-project-1, ...)

### ScheduledJob

- Fields: id, name, description, cronExpression, promptTemplate, jobType (7 types), workspaceType, workspaceRef, sourceBranch, targetBranch, modelId, enabled, maxIterations, lastRunAt, nextRunAt, lastTaskId, timestamps

### User

- Fields: id, provider (github/google), providerAccountId, email, name, avatarUrl, bitbucketUrl, bitbucketProjectKey, bitbucketUsername, bitbucketTokenEncrypted, copilotTokenEncrypted, byokProviderType, byokBaseUrl, byokApiKeyEncrypted, jiraUrl, jiraProjectKey, jiraUsername, jiraTokenEncrypted, jiraAutoTaskEnabled (default: true), timestamps

### JiraIssueOptOut

- Fields: id, user (FK), jiraIssueKey, reason, createdAt
- Purpose: Tracks Jira issues that users have opted out of auto-task creation. When a user cancels a task with a Jira issue, an opt-out record is automatically created to prevent future automatic task creation for that issue.
- Constraint: Unique (user_id, jira_issue_key)

---

## API Endpoints

| Method | Endpoint                           | Description              |
| ------ | ---------------------------------- | ------------------------ |
| POST   | /api/tasks                         | Create task              |
| GET    | /api/tasks                         | List tasks (paginated)   |
| GET    | /api/tasks/{id}                    | Get task                 |
| GET    | /api/tasks/{id}/events             | Get task events          |
| PATCH  | /api/tasks/{id}                    | Update task (partial)    |
| POST   | /api/tasks/{id}/start              | Start task               |
| POST   | /api/tasks/{id}/cancel             | Cancel task              |
| POST   | /api/tasks/{id}/retry              | Retry task (set PENDING)  |
| POST   | /api/tasks/{id}/clone              | Clone task (retry flow)   |
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
| GET    | /api/jira-opt-outs/user/{userId}   | Get user opt-outs        |
| POST   | /api/jira-opt-outs                 | Create opt-out           |
| DELETE | /api/jira-opt-outs                 | Delete opt-out           |
| GET    | /api/jira-opt-outs/check           | Check opt-out status     |
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
> Completed: Full-stack Next.js app with all server-side logic (tasks with PATCH update, scheduled jobs, workspace types, model selection with 14+ models and dynamic discovery, iterative sessions, user management with encrypted secrets, BYOK provider support, Jira integration with opt-out mechanism for cancelled tasks) using Drizzle ORM for direct PostgreSQL access — no separate backend. Frontend UI (dashboard with bounded-height scrollable Kanban columns, task dialog with SDLC template picker and selectors, task detail with auto-expanded code diffs, scheduled jobs page, copilot chat with slash commands, dark mode with next-themes, snow toggle effect, custom favicon, authentication with NextAuth.js v5, settings page with BYOK/Ollama config and Jira, login page, React Compiler), CLI, Slack bot (with /model, /review, /fleet commands and auto-start on create), Docker Compose, Podman support, monorepo structure, one-command deploy, Playwright E2E tests.
>
> Copilot SDK heavily integrated: session hooks (onPreToolUse/onPostToolUse/onSessionStart/onSessionEnd/onErrorOccurred), custom tools via defineTool with zod (get_task_info, report_progress), infinite sessions with compaction (0.8/0.95 thresholds), user input requests (ask_user), BYOK providers (OpenAI/Azure/Anthropic/Ollama), session history (list/resume/delete via SDK), token tracking (real-time input/output via assistant.usage events), conversation export (Markdown). Code review transformed to fix & validate paradigm (runs once after all iterations). SSE evaluated — necessary as transport layer from server-side SDK events to browser. Model selector handles empty models gracefully. Monitoring dashboard redesigned with cost estimation, performance metrics, and time-range filtering. 72 test files with 920 tests passing.
