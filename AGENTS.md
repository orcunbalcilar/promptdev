# Rules

- always use official docs, use context7 tools/skills
- always prefer the practices of any library or framework, no manual workaround just to develop or solve anything.
- always cover all changes by tests and validate them all by running. Nothing is worse than slop code.
- use skills in developing the features. They will give you the relevant best practices of the framework or library
- always make detailed research on the web before taking any design or implementation decision. You can use the web to find the best practices, patterns, and solutions for the problem at hand.
- always update the documentation and readme files to reflect the changes you made.
- always try finishing all the work in one go. Do not leave any work half done.
- always use Claude Opus 4.6 parallel subagents to be fast and efficient.
- always work in parallel by using the unlimited Claude Opus 4.6 parallel subagents.
- always be responsible for the project and its code quality. "None of these are caused by my changes." is not an acceptable answer. If you see any issues, fix them.
- always learn from your mistakes. And update the rules under lessons section. This is as important as implementing the features.

## Lessons

- **vi.fn() constructor mocks**: Arrow functions in `mockImplementation` cannot be used with `new`. Always use `function() {}` or `class` syntax when mocking constructable APIs like EventSource, CopilotClient, etc. Vitest will warn "did not use 'function' or 'class'" if violated.
- **Singleton module state in tests**: When production code uses module-level singletons with startup guards (e.g. `clientStarting`, `clientStartPromise`), the `shutdown()` / cleanup function MUST reset ALL guard variables—not just null the singleton reference. Otherwise subsequent tests hit stale guards that point to the old (null) instance.
- **Never use `mockResolvedValueOnce` with hooks that have `useEffect` fetches**: Race conditions between `useEffect` async calls and test actions cause `Once` mock values to be consumed in the wrong order. Use URL-based `mockImplementation` routing instead (match on URL + method).
- **Fake timers deadlock with React Query / waitFor**: `vi.useFakeTimers()` freezes `setInterval` which `waitFor` and React Query scheduling depend on. Either render with real timers first then switch, or use real-timer `waitFor` with appropriate timeout. Scoped faking (`{ toFake: ['setTimeout'] }`) alone is not sufficient.
- **React `createPortal` in jsdom**: Portal cleanup causes `NotFoundError: node to remove is not a child`. Fix by mocking `react-dom` to render children inline: `createPortal: (children) => children`.
- **CSS `transition-all` reflow issues**: Using `transition-all` on interactive elements (task cards, buttons) causes layout thrashing on hover. Always specify exact properties: `transition: transform 200ms ease, box-shadow 200ms ease`.
- **DB mock must export `getDb`**: Service tests mock `@/lib/db` as `{ db: mockDb }` but services import `getDb()`. Always include both: `{ db: mockDb, getDb: () => mockDb }`.
- **Auth guard mock in route tests**: API route tests that import route handlers must mock `@/lib/auth-guard` (`requireAuth`, `requireTaskOwnership`), otherwise auth calls fail silently in test environment.
- **Silent query failures hide UI content**: When React Query `useQuery` errors aren't destructured and handled, conditionally-rendered content (`{data && <Content/>}`) silently disappears. Always destructure `error` from `useQuery` and display it.
- **Playwright auth setup for protected routes**: When `proxy.ts` (NextAuth middleware) redirects unauthenticated users to `/login`, e2e tests need a Playwright setup project that authenticates first and saves `storageState`. Other test projects depend on this setup and inherit the auth state. Tests that need unauthenticated state should use `test.use({ storageState: { cookies: [], origins: [] } })`.
- **Drizzle `.defaultNow()` vs `.$defaultFn()`**: `.defaultNow()` generates SQL `DEFAULT` keyword requiring a DB-level `DEFAULT NOW()` constraint. Use `.$defaultFn(() => new Date())` for JS-level defaults when the DB column has no DEFAULT constraint.
- **Playwright `getByText()` strict mode**: `getByText("Back")` can match multiple elements (buttons AND text content containing "back"). Use `getByRole("button", { name: "Back" })` for precise element targeting.
- **Missing env vars for dev auth**: `ENABLE_DEV_CREDENTIALS=true` and `DEV_PASSWORD=password` must be in `.env` for the Credentials provider to be registered in `auth.ts`. The login page always renders the "Sign in as Test User" button in dev mode (`NODE_ENV === "development"`), but it will fail silently if the server-side provider isn't enabled.
- **Avoid viewport units for scrolling containers**: Using `h-[calc(100vh-220px)]` often breaks mobile layouts where keyboard or browser chrome changes visible height. Use flexbox with `flex-1 min-h-0` for robust full-height layouts that handle overflow correctly across devices.
- **`oklch` color contrast**: When using `oklch` for theme colors, ensure sufficient lightness contrast between background and foreground elements (especially scrollbars and borders). Low-opacity light colors on white backgrounds can become invisible on some displays.
