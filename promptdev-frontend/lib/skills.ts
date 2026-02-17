/**
 * Agent Skills Registry
 *
 * Provides structured, detailed skill definitions that enrich the AI agent's
 * system prompt with domain-specific best practices and guidelines.
 *
 * Each skill contains:
 * - id: Unique identifier stored in the task
 * - label: Human-readable short name for UI
 * - description: Brief description for tooltips
 * - category: Grouping for UI organization
 * - context: Rich prompt text injected into the agent's system prompt
 */

export interface Skill {
  id: string;
  label: string;
  description: string;
  category: SkillCategory;
  context: string;
}

export type SkillCategory =
  | "frontend"
  | "backend"
  | "testing"
  | "devops"
  | "quality";

export const SKILL_CATEGORIES: Record<
  SkillCategory,
  { label: string; order: number }
> = {
  frontend: { label: "Frontend", order: 0 },
  backend: { label: "Backend", order: 1 },
  testing: { label: "Testing", order: 2 },
  devops: { label: "DevOps", order: 3 },
  quality: { label: "Quality", order: 4 },
};

export const SKILLS: Skill[] = [
  // ── Frontend ──────────────────────────────────────────────────
  {
    id: "react",
    label: "React",
    description: "React component best practices & patterns",
    category: "frontend",
    context: `## React Best Practices
- Use functional components exclusively. Never use class components.
- Prefer composition over inheritance. Build compound components with shared context.
- Avoid boolean prop proliferation — create explicit variant components instead.
- Calculate derived state during render; do NOT store it in state or sync with useEffect.
- Use functional setState for state that depends on previous value: \`setState(prev => ...)\`.
- Use lazy state initialization for expensive values: \`useState(() => expensiveInit())\`.
- Extract expensive work into memoized sub-components to enable early returns.
- Put interaction logic in event handlers, not effects.
- Narrow effect dependencies to primitives (e.g., \`user.id\` not \`user\`).
- Use \`startTransition\` for non-urgent state updates (search input filtering, etc.).
- Use \`useRef\` for frequently-changing transient values that don't need re-renders.
- Hoist static JSX elements outside components to avoid recreation.
- Use explicit conditional rendering (ternary) instead of \`&&\` to avoid rendering 0/false.
- With React 19: use \`use()\` instead of \`useContext()\`; ref is now a regular prop — no forwardRef.`,
  },
  {
    id: "nextjs",
    label: "Next.js",
    description: "Next.js App Router patterns & data fetching",
    category: "frontend",
    context: `## Next.js Best Practices (App Router)
- Server Components are default — only add "use client" when you need state, effects, or browser APIs.
- Minimize data passed across the Server/Client boundary. Only serialize fields the client actually uses.
- Use Suspense boundaries to stream content: show the shell immediately while async data loads.
- Parallelize data fetching with component composition — sibling RSCs fetch simultaneously.
- Use React.cache() for per-request deduplication of server-side queries.
- Use next/dynamic for heavy client components (editors, charts, maps) to reduce initial bundle.
- Avoid barrel file imports — import directly from source files to reduce bundle size.
- Authenticate Server Actions like API routes: always verify auth inside each action.
- Use after() from next/server for non-blocking operations (analytics, logging) after response.
- Use route handlers (app/api/) for external API integration; Server Actions for mutations.
- Place shared layouts in layout.tsx; page-specific data fetching in page.tsx.
- Prefer loading.tsx and error.tsx conventions over manual loading/error states.
- Use optimizePackageImports in next.config for large icon/component libraries.`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    description: "Type-safe development with strict TypeScript",
    category: "frontend",
    context: `## TypeScript Best Practices
- Enable strict mode: \`strict: true\` in tsconfig.json.
- Use interfaces for object shapes; use type for unions, intersections, and utility types.
- Prefer \`unknown\` over \`any\`; use type narrowing with type guards.
- Use discriminated unions for state machines and variant types.
- Use const assertions (\`as const\`) for literal types and enums.
- Prefer \`satisfies\` operator for type checking without widening.
- Use generic constraints (\`extends\`) to make functions flexible but type-safe.
- Use \`readonly\` and \`ReadonlyArray<T>\` for immutable data.
- Use \`Record<string, T>\` instead of \`{[key: string]: T}\`.
- Use template literal types for string pattern enforcement.
- Always type function return values explicitly for public APIs.
- Use \`Pick<T, K>\`, \`Omit<T, K>\`, \`Partial<T>\`, \`Required<T>\` for derived types.
- Avoid type assertions (\`as\`); prefer type guards and narrowing.`,
  },
  // ── Backend ───────────────────────────────────────────────────
  {
    id: "java",
    label: "Java",
    description: "Java & Spring Boot development",
    category: "backend",
    context: `## Java & Spring Boot Best Practices
- Use Java 21+ features: records, sealed interfaces, pattern matching (switch), text blocks.
- Use constructor injection (Lombok @RequiredArgsConstructor) — never field injection.
- Follow layered architecture: Controller → Service → Repository. No business logic in controllers.
- Use DTOs for API boundaries — never expose entities directly.
- Use Optional return types for nullable queries; avoid Optional as method parameters.
- Use Spring Data JPA derived query methods for simple queries; @Query for complex ones.
- Validate inputs with Jakarta Bean Validation (@NotNull, @NotBlank, @Size, etc.).
- Use @Transactional at service level; keep transactions short.
- Handle exceptions with @RestControllerAdvice global handlers.
- Use Lombok (@Data, @Builder, @Getter, @Setter) to reduce boilerplate.
- Use \`ddl-auto: validate\` in production; manage schema with migrations (Flyway/Liquibase).
- For encryption: AES-256-GCM, fresh IV per operation, Base64 encode for storage.
- Write unit tests with JUnit 5 + Mockito; integration tests with @SpringBootTest.`,
  },
  {
    id: "python",
    label: "Python",
    description: "Python development best practices",
    category: "backend",
    context: `## Python Best Practices
- Use Python 3.12+ features: type hints, match statements, f-strings, walrus operator.
- Use type hints with \`from __future__ import annotations\` for all function signatures.
- Use dataclasses or Pydantic models for structured data.
- Use virtual environments (venv, uv, or poetry) for dependency management.
- Follow PEP 8 naming conventions: snake_case for functions/variables, PascalCase for classes.
- Use context managers (with statements) for resource management.
- Use list/dict/set comprehensions over manual loops where readable.
- Handle exceptions specifically — never use bare \`except:\`.
- Use async/await with asyncio for I/O-bound operations.
- Use pytest for testing with fixtures and parametrize decorators.
- Use logging module instead of print statements.
- Use pathlib.Path instead of os.path for file operations.
- Structure projects with src/ layout and pyproject.toml.`,
  },
  {
    id: "database",
    label: "Database",
    description: "Database design & query optimization",
    category: "backend",
    context: `## Database Best Practices
- Design normalized schemas (3NF minimum) unless denormalization is justified by read patterns.
- Use proper data types: UUID for IDs, TIMESTAMPTZ for dates, TEXT for variable-length strings.
- Create indexes for all foreign keys and frequently queried columns.
- Use composite indexes for multi-column WHERE clauses (leftmost prefix rule).
- Write N+1 safe queries: use JOINs or batch fetching instead of loops.
- Use parameterized queries always — never string concatenation for SQL.
- Add NOT NULL constraints unless null is a valid business state.
- Use database transactions for multi-step operations; keep them short.
- Use EXPLAIN ANALYZE to verify query performance.
- Add CHECK constraints for business rules enforced at the DB level.
- Use migration tools (Flyway, Liquibase, Prisma Migrate) for schema changes.
- Implement soft deletes with a \`deleted_at\` timestamp column where appropriate.`,
  },
  {
    id: "api",
    label: "API Design",
    description: "REST API design & implementation",
    category: "backend",
    context: `## REST API Design Best Practices
- Use resource-oriented URLs: /users/{id}/orders, not /getUserOrders.
- Use proper HTTP methods: GET (read), POST (create), PUT (replace), PATCH (update), DELETE.
- Return appropriate status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 404 Not Found, 409 Conflict.
- Use consistent error response format: { "error": "code", "message": "human-readable", "details": {} }.
- Implement pagination for list endpoints: ?page=0&size=20 with total/totalPages in response.
- Use query parameters for filtering/sorting: ?status=active&sort=created_at,desc.
- Version APIs when making breaking changes: /api/v2/users.
- Validate all inputs at the API boundary before processing.
- Return only necessary fields — use DTOs to shape responses.
- Document with OpenAPI/Swagger specifications.
- Implement rate limiting for public endpoints.
- Use HATEOAS links for discoverability where appropriate.`,
  },
  // ── Testing ───────────────────────────────────────────────────
  {
    id: "testing",
    label: "Testing",
    description: "Comprehensive testing strategies",
    category: "testing",
    context: `## Testing Best Practices
- Follow the testing pyramid: many unit tests, fewer integration tests, minimal E2E tests.
- Write tests that verify behavior, not implementation details.
- Use the Arrange-Act-Assert (AAA) pattern for test structure.
- Name tests descriptively: "should return 404 when user not found" not "test1".
- Mock external dependencies (APIs, databases) in unit tests.
- Use real dependencies in integration tests with test containers.
- Test edge cases: empty inputs, null values, boundary conditions, error paths.
- Aim for meaningful coverage (critical paths), not 100% line coverage.
- Use test fixtures and factories for consistent test data.
- Tests should be independent — never rely on execution order.
- Keep tests fast: unit tests < 100ms, integration tests < 5s.
- Use snapshot testing sparingly — only for stable serialization formats.
- For frontend: test user interactions with Testing Library, not implementation details.`,
  },
  {
    id: "playwright",
    label: "Playwright",
    description: "Browser automation & E2E testing",
    category: "testing",
    context: `## Playwright Best Practices
- Use locators over raw selectors: getByRole(), getByText(), getByTestId(), getByLabel().
- Prefer user-facing attributes: role, text, label > class names, IDs, CSS selectors.
- Use web assertions (expect(locator).toBeVisible()) — they auto-retry and wait.
- Use Page Object Model (POM) to abstract page interactions into reusable classes.
- Use test.describe() for grouping and test.beforeEach() for setup.
- Handle authentication with storageState to reuse login across tests.
- Enable trace-on-failure for debugging: \`use: { trace: 'on-first-retry' }\`.
- Run tests in parallel by default; isolate state between tests.
- Use expect(page).toHaveURL() and expect(page).toHaveTitle() for navigation assertions.
- For API testing, use request fixture: \`const response = await request.get('/api/users')\`.
- Use test.slow() for known slow tests instead of arbitrary timeouts.
- Configure retries in CI: \`retries: process.env.CI ? 2 : 0\`.`,
  },
  // ── DevOps ────────────────────────────────────────────────────
  {
    id: "docker",
    label: "Docker",
    description: "Containerization & deployment",
    category: "devops",
    context: `## Docker Best Practices
- Use multi-stage builds to minimize final image size.
- Use specific base image tags (node:22-alpine, not node:latest).
- Copy package.json/lock first, install deps, then copy source — leverage layer caching.
- Use .dockerignore to exclude node_modules, .git, local configs.
- Run as non-root user: \`USER node\` or create a dedicated user.
- Use HEALTHCHECK instructions for container orchestration.
- Keep images minimal: use alpine variants, remove build dependencies.
- Use environment variables for configuration, not hardcoded values.
- Use docker-compose for local multi-service development.
- Pin dependency versions in Dockerfiles for reproducible builds.
- Use named volumes for persistent data; bind mounts for development.
- Set memory and CPU limits in production deployments.`,
  },
  // ── Quality ───────────────────────────────────────────────────
  {
    id: "security",
    label: "Security",
    description: "Security audit & vulnerability detection",
    category: "quality",
    context: `## Security Best Practices
- Never hardcode secrets, API keys, or credentials. Use environment variables.
- Validate and sanitize all user inputs at every layer (client, server, database).
- Use parameterized queries/prepared statements — never concatenate SQL.
- Implement proper authentication: verify tokens/sessions on every request.
- Apply authorization checks in every endpoint — don't rely solely on middleware.
- Use HTTPS everywhere. Set security headers: CSP, X-Frame-Options, HSTS.
- Encrypt sensitive data at rest (AES-256-GCM) and in transit (TLS 1.3).
- Implement rate limiting and brute force protection on auth endpoints.
- Store passwords with bcrypt/argon2 — never plain text or reversible encryption.
- Use CSRF tokens for state-changing requests in web forms.
- Validate file uploads: check MIME type, size, and sanitize filenames.
- Log security events (failed logins, privilege escalations) without leaking sensitive data.
- Regularly update dependencies and scan for known vulnerabilities.`,
  },
  {
    id: "performance",
    label: "Performance",
    description: "Performance optimization techniques",
    category: "quality",
    context: `## Performance Best Practices
- Measure before optimizing. Use profiling tools to identify actual bottlenecks.
- Eliminate request waterfalls: use Promise.all() for independent async operations.
- Implement caching at appropriate levels: browser, CDN, application, database.
- Use lazy loading for resources not needed on initial render.
- Optimize database queries: add indexes, avoid N+1, use EXPLAIN ANALYZE.
- Minimize serialization: only send data the client needs.
- Use pagination for list endpoints — never return unbounded results.
- Implement connection pooling for database and HTTP connections.
- Use streaming (SSE, WebSocket) instead of polling when possible.
- Optimize images: use modern formats (WebP, AVIF), proper sizing, lazy loading.
- Use code splitting and tree shaking to reduce JavaScript bundle size.
- Set proper Cache-Control headers for static assets.
- Use Web Workers for CPU-intensive operations that would block the main thread.`,
  },
];

/**
 * Get skills organized by category, sorted by category order.
 */
export function getSkillsByCategory(): Array<{
  category: SkillCategory;
  label: string;
  skills: Skill[];
}> {
  const grouped = new Map<SkillCategory, Skill[]>();

  for (const skill of SKILLS) {
    const existing = grouped.get(skill.category) ?? [];
    existing.push(skill);
    grouped.set(skill.category, existing);
  }

  return Array.from(grouped.entries())
    .map(([category, skills]) => ({
      category,
      label: SKILL_CATEGORIES[category].label,
      skills,
    }))
    .sort(
      (a, b) =>
        SKILL_CATEGORIES[a.category].order -
        SKILL_CATEGORIES[b.category].order,
    );
}

/**
 * Look up a skill by ID.
 */
export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

/**
 * Build the full skills context prompt from a comma-separated skills string.
 * Returns empty string if no valid skills are found.
 */
export function buildSkillsPrompt(skillsStr: string): string {
  if (!skillsStr) return "";

  const skillIds = skillsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (skillIds.length === 0) return "";

  const matchedSkills = skillIds
    .map((id) => getSkillById(id))
    .filter((s): s is Skill => s !== undefined);

  if (matchedSkills.length === 0) {
    // Fallback for unknown skill IDs: add as generic mentions
    return `\n<agent_skills>\nThe following skills are relevant to this task: ${skillIds.join(", ")}.\nApply best practices for each domain.\n</agent_skills>`;
  }

  const contextBlocks = matchedSkills
    .map((skill) => skill.context)
    .join("\n\n");

  return `\n<agent_skills>\nYou have expertise in the following domains. Follow these guidelines strictly:\n\n${contextBlocks}\n</agent_skills>`;
}
