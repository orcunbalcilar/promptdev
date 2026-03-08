# PromptDev Frontend

Next.js 16 web application with React 19, Tailwind CSS, and shadcn/ui.

## Features

- **Task Management**: Create and manage AI-powered development tasks with SDLC template picker
- **Live Task Status**: Processing indicators automatically stop when tasks reach terminal states (completed, failed, or cancelled)
- **Copilot SDK Integration**: Full SDK feature surface — session hooks, custom tools (`defineTool`), infinite sessions with compaction, user input requests, streaming, BYOK providers, session history (list/resume/delete), and conversation export
- **Code Review (Fix & Validate)**: Code review runs once after all iterations and actively fixes issues rather than just suggesting changes
- **Dark Mode**: System-aware theme switching with light/dark/system options via `next-themes`
- **Copilot Chat**: Interactive AI assistant with session history sidebar, token usage display, conversation export, quick prompts, and slash commands
- **Kanban Dashboard**: Scrollable 5-column board with bounded height (no infinite page growth)
- **SDLC Templates**: 11 pre-built task templates across 8 categories (feature, bugfix, refactor, testing, review, docs, security, performance)
- **BYOK Providers**: Connect Ollama, vLLM, OpenAI, Azure, or Anthropic — configured in Settings
- **Real-time Updates**: SSE-powered live task events and Copilot session streaming
- **Monitoring**: Developer-focused analytics dashboard with cost estimation, performance metrics, time-range filtering, session/error/review tabs, and auto-refresh
- **Settings**: Configure providers, authentication, and integrations

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scripts

| Command          | Description                           |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Development server with hot reload    |
| `pnpm build`     | Production build                      |
| `pnpm start`     | Start production server               |
| `pnpm test`      | Unit tests (Vitest)                   |
| `pnpm test:e2e`  | E2E tests (Playwright)                |
| `pnpm lint`      | ESLint                                |

## Architecture

### Copilot SDK Integration

The project heavily leverages the `@github/copilot-sdk` (v0.1.24):

- **Session Management**: `onPreToolUse`, `onPostToolUse`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred` — integrated with monitoring
- **Session History**: `listSessions`, `resumeSession`, `getMessages`, `deleteSession` — browsable sidebar with search and resume
- **Token Tracking**: Real-time input/output token display via `assistant.usage` events
- **Conversation Export**: Export chat as Markdown or copy to clipboard
- **Custom Tools**: `get_task_info` and `report_progress` defined with `defineTool()` + zod schemas
- **Infinite Sessions**: Automatic context compaction at 80%/95% thresholds
- **User Input Requests**: `ask_user` tool routing from SDK to frontend
- **BYOK Providers**: OpenAI-compatible, Azure, Anthropic via `provider` config in session creation
- **Streaming**: Delta events relayed via SSE to browser clients

### SSE Architecture

SSE is necessary and cannot be replaced by the SDK's event system because SDK events are server-side only. SSE provides the transport layer to push events to browser clients.

| Endpoint | Purpose |
| --- | --- |
| `/api/copilot/sessions/[id]/stream` | SDK event relay to browser |
| `/api/stream/tasks/[id]` | Task-specific progress events |
| `/api/stream/tasks` | Global dashboard updates |

### Testing

**Unit Tests** — 100% coverage enforced via Vitest with v8 coverage provider:

| Metric     | Coverage |
|------------|----------|
| Statements | 100%     |
| Branches   | 100%     |
| Functions  | 100%     |
| Lines      | 100%     |

Run unit tests: `pnpm test`
Run with coverage: `npx vitest run --coverage`

**E2E Tests** — 60 Playwright tests covering all application routes:

| Route             | Tests | Status |
|-------------------|-------|--------|
| `/login`          | 4     | ✅     |
| `/` (Dashboard)   | 5     | ✅     |
| `/tasks/[id]`     | 20+   | ✅     |
| `/settings`       | 6     | ✅     |
| `/monitoring`     | 8     | ✅     |
| `/scheduled-jobs` | 7     | ✅     |
| `/copilot`        | 7     | ✅     |
| 404 pages         | 4     | ✅     |

Run E2E tests: `pnpm test:e2e`

**Prerequisites for E2E:**

- Dev server running on port 3500 (`pnpm dev`)
- `.env.local` with `ENABLE_DEV_CREDENTIALS=true` and `DEV_PASSWORD=password`
- PostgreSQL database accessible at `DATABASE_URL`
