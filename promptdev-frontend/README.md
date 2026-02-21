# PromptDev Frontend

Next.js 16 web application with React 19, Tailwind CSS, and shadcn/ui.

## Features

- **Task Management**: Create and manage AI-powered development tasks with SDLC template picker
- **Live Task Status**: Processing indicators automatically stop when tasks reach terminal states (completed, failed, or cancelled)
- **Copilot SDK Integration**: Full SDK feature surface — session hooks, custom tools (`defineTool`), infinite sessions with compaction, user input requests, streaming, and BYOK providers
- **Code Review (Fix & Validate)**: Code review runs once after all iterations and actively fixes issues rather than just suggesting changes
- **Dark Mode**: System-aware theme switching with light/dark/system options via `next-themes`
- **Copilot Chat**: Interactive AI assistant for development questions
- **Kanban Dashboard**: Scrollable 5-column board with bounded height (no infinite page growth)
- **SDLC Templates**: 11 pre-built task templates across 8 categories (feature, bugfix, refactor, testing, review, docs, security, performance)
- **BYOK Providers**: Connect Ollama, vLLM, OpenAI, Azure, or Anthropic — configured in Settings
- **Real-time Updates**: SSE-powered live task events and Copilot session streaming
- **Monitoring**: Track sessions, reviews, and activity
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

- **Session Hooks**: `onPreToolUse`, `onPostToolUse`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred` — integrated with monitoring
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

- **602 unit tests** via Vitest with jsdom environment
- E2E tests via Playwright (use dev auth, 0x models to avoid token burn)
