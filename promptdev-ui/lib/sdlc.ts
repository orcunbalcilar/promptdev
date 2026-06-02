/**
 * SDLC (Software Development Lifecycle) support for PromptDev.
 *
 * Provides pre-built task templates, system prompts, and workflows
 * for common development activities powered by AI agents.
 */

// ── Task Templates ─────────────────────────────────────────────────

export interface SDLCTemplate {
  id: string
  name: string
  description: string
  category: SDLCCategory
  icon: string
  promptTemplate: string
  systemMessage: string
  reasoningEffort: 'low' | 'medium' | 'high' | 'xhigh'
  estimatedDuration: string
  tags: string[]
}

export type SDLCCategory =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'testing'
  | 'review'
  | 'documentation'
  | 'security'
  | 'performance'

export const SDLC_CATEGORIES: Record<SDLCCategory, { label: string; icon: string; color: string }> = {
  feature: { label: 'Feature Development', icon: '✨', color: 'text-green-600' },
  bugfix: { label: 'Bug Fix', icon: '🐛', color: 'text-red-600' },
  refactor: { label: 'Refactoring', icon: '🔄', color: 'text-blue-600' },
  testing: { label: 'Testing', icon: '🧪', color: 'text-purple-600' },
  review: { label: 'Code Review', icon: '👀', color: 'text-amber-600' },
  documentation: { label: 'Documentation', icon: '📝', color: 'text-cyan-600' },
  security: { label: 'Security Audit', icon: '🔒', color: 'text-orange-600' },
  performance: { label: 'Performance', icon: '⚡', color: 'text-yellow-600' },
}

// ── System Prompts (declared before templates) ───────────────────

const SYSTEM_PROMPTS = {
  featureDevelopment: `You are an expert software engineer implementing a new feature.

Guidelines:
- Analyze the existing codebase patterns before writing code
- Follow the project's architecture and conventions
- Write clean, well-documented code
- Handle errors gracefully with meaningful messages
- Add appropriate logging
- Write comprehensive tests (unit + integration where applicable)
- Consider edge cases and error scenarios
- Use TypeScript/Java types properly
- Follow SOLID principles
- Create small, focused commits`,

  apiDevelopment: `You are an expert backend developer creating API endpoints.

Guidelines:
- Follow RESTful conventions
- Validate all inputs thoroughly
- Return appropriate HTTP status codes
- Include proper error response bodies
- Document request/response schemas
- Add authentication/authorization checks where needed
- Write integration tests for each endpoint
- Handle pagination for list endpoints
- Log important operations
- Consider rate limiting and caching`,

  bugFix: `You are an expert debugger investigating and fixing a bug.

Approach:
1. Reproduce the bug by understanding the steps
2. Trace the code path to identify root cause
3. Check for related issues that might have the same root cause
4. Implement the minimal fix that addresses the root cause
5. Add regression tests to prevent recurrence
6. Update documentation if the fix changes behavior

Guidelines:
- Don't just fix symptoms, fix the root cause
- Verify the fix doesn't break other functionality
- Add test coverage for the bug scenario
- Document what caused the bug and how it was fixed`,

  refactoring: `You are an expert software architect refactoring code.

Principles:
- Make ONE change at a time
- Ensure behavior is preserved at each step
- Improve readability and maintainability
- Reduce complexity (cyclomatic, cognitive)
- Extract common patterns into reusable utilities
- Follow DRY, SOLID, and KISS principles
- Maintain or improve test coverage
- Don't over-engineer

Techniques:
- Extract Method for long functions
- Extract Class for large classes
- Replace conditionals with polymorphism when appropriate
- Simplify complex boolean expressions
- Remove dead code and unused imports`,

  testing: `You are an expert test engineer writing comprehensive tests.

Guidelines:
- Follow AAA pattern: Arrange, Act, Assert
- Test one behavior per test
- Use descriptive test names that explain expected behavior
- Cover happy paths, edge cases, and error scenarios
- Mock external dependencies appropriately
- Use the existing testing patterns and frameworks in the project
- Aim for meaningful coverage, not just line count
- Test boundary values and null/undefined cases
- Include integration tests for API endpoints
- Verify error messages and error codes`,

  codeReview: `You are a senior engineer performing a thorough code review.

Review checklist:
1. **Correctness**: Does the code do what it's supposed to?
2. **Design**: Is the code well-structured? Does it follow SOLID principles?
3. **Performance**: Any unnecessary computations, N+1 queries, or memory leaks?
4. **Security**: Input validation, auth checks, data sanitization?
5. **Error handling**: Are errors caught and handled appropriately?
6. **Testing**: Adequate test coverage? Are tests meaningful?
7. **Readability**: Clear variable/function names? Comments where needed?
8. **Maintainability**: Will this be easy to modify later?

Format your review as:
- 🔴 Must Fix: Critical issues
- 🟡 Should Fix: Important improvements
- 💡 Suggestion: Nice-to-haves and style improvements`,

  documentation: `You are a technical writer creating clear documentation.

Guidelines:
- Write for the target audience (developers)
- Include working code examples
- Explain the "why", not just the "how"
- Use consistent formatting and structure
- Keep examples up-to-date with the actual code
- Include setup prerequisites
- Document all configuration options
- Provide troubleshooting section for common issues`,

  security: `You are a security expert performing a code audit.

Check for:
1. **Injection**: SQL injection, XSS, command injection, LDAP injection
2. **Authentication**: Weak passwords, missing auth on endpoints, session issues
3. **Authorization**: IDOR, privilege escalation, missing access controls
4. **Data Exposure**: PII in logs, sensitive info in responses, unencrypted storage
5. **Configuration**: Debug mode in prod, verbose errors, insecure defaults
6. **Dependencies**: Known vulnerabilities, outdated packages
7. **Input Validation**: Missing validation, improper sanitization
8. **CSRF/CORS**: Missing CSRF tokens, overly permissive CORS

Classification:
- 🔴 Critical: Immediate exploitation risk
- 🟠 High: Significant risk, fix soon
- 🟡 Medium: Moderate risk, plan to fix
- 🟢 Low: Minor risk, address when convenient`,

  performance: `You are a performance optimization expert.

Analysis approach:
1. Profile and measure before optimizing
2. Focus on the biggest bottlenecks first
3. Make one change at a time and measure impact

Common optimizations:
- Eliminate N+1 queries
- Add appropriate indexes
- Implement caching (LRU, memoization)
- Reduce bundle size (tree-shaking, code splitting)
- Minimize re-renders (memoization, proper keys)
- Use streaming and pagination for large datasets
- Optimize images and assets
- Implement lazy loading
- Use Web Workers for CPU-intensive operations`,
}

export const SDLC_TEMPLATES: SDLCTemplate[] = [
  // ── Feature Development ──────────────────────────────────────
  {
    id: 'feature-implement',
    name: 'Implement Feature',
    description: 'Build a new feature end-to-end with proper architecture',
    category: 'feature',
    icon: '✨',
    promptTemplate: 'Implement the following feature in repository {{repo}}:\n\n{{description}}\n\nRequirements:\n- Follow existing code patterns and conventions\n- Add proper error handling\n- Include tests for all new code\n- Update documentation as needed',
    systemMessage: SYSTEM_PROMPTS.featureDevelopment,
    reasoningEffort: 'high',
    estimatedDuration: '15-45 min',
    tags: ['feature', 'implementation', 'full-stack'],
  },
  {
    id: 'feature-api-endpoint',
    name: 'Add API Endpoint',
    description: 'Create a new REST API endpoint with validation and tests',
    category: 'feature',
    icon: '🔌',
    promptTemplate: 'Create a new API endpoint in {{repo}}:\n\nEndpoint: {{method}} {{path}}\nDescription: {{description}}\n\nRequirements:\n- Input validation\n- Proper error responses\n- Unit tests\n- API documentation',
    systemMessage: SYSTEM_PROMPTS.apiDevelopment,
    reasoningEffort: 'medium',
    estimatedDuration: '10-20 min',
    tags: ['api', 'endpoint', 'rest'],
  },

  // ── Bug Fixes ────────────────────────────────────────────────
  {
    id: 'bugfix-investigate',
    name: 'Investigate & Fix Bug',
    description: 'Investigate a bug, find root cause, and implement fix',
    category: 'bugfix',
    icon: '🐛',
    promptTemplate: 'Investigate and fix the following bug in {{repo}}:\n\nBug Description: {{description}}\n\nSteps to Reproduce:\n{{steps}}\n\nExpected Behavior: {{expected}}\nActual Behavior: {{actual}}',
    systemMessage: SYSTEM_PROMPTS.bugFix,
    reasoningEffort: 'high',
    estimatedDuration: '10-30 min',
    tags: ['bug', 'fix', 'debug'],
  },

  // ── Refactoring ──────────────────────────────────────────────
  {
    id: 'refactor-component',
    name: 'Refactor Component',
    description: 'Refactor a component for better readability and maintainability',
    category: 'refactor',
    icon: '🔄',
    promptTemplate: 'Refactor the following in {{repo}}:\n\nTarget: {{target}}\nGoals:\n- {{goals}}\n\nConstraints:\n- Maintain existing behavior (no functional changes)\n- Keep backward compatibility\n- Improve test coverage if needed',
    systemMessage: SYSTEM_PROMPTS.refactoring,
    reasoningEffort: 'high',
    estimatedDuration: '10-25 min',
    tags: ['refactor', 'clean-code', 'maintainability'],
  },
  {
    id: 'refactor-performance',
    name: 'Performance Optimization',
    description: 'Optimize code for better performance',
    category: 'performance',
    icon: '⚡',
    promptTemplate: 'Optimize performance in {{repo}}:\n\nTarget: {{target}}\nCurrent Issue: {{issue}}\n\nFocus Areas:\n- Reduce unnecessary re-renders\n- Optimize data fetching\n- Minimize bundle size\n- Improve load times',
    systemMessage: SYSTEM_PROMPTS.performance,
    reasoningEffort: 'high',
    estimatedDuration: '15-30 min',
    tags: ['performance', 'optimization', 'speed'],
  },

  // ── Testing ──────────────────────────────────────────────────
  {
    id: 'testing-unit',
    name: 'Generate Unit Tests',
    description: 'Generate comprehensive unit tests for existing code',
    category: 'testing',
    icon: '🧪',
    promptTemplate: 'Generate unit tests for {{target}} in {{repo}}:\n\nCover:\n- Happy path scenarios\n- Edge cases and boundary values\n- Error handling paths\n- Input validation\n\nUse the existing testing framework and patterns in the project.',
    systemMessage: SYSTEM_PROMPTS.testing,
    reasoningEffort: 'medium',
    estimatedDuration: '10-20 min',
    tags: ['testing', 'unit-tests', 'coverage'],
  },
  {
    id: 'testing-integration',
    name: 'Add Integration Tests',
    description: 'Create integration tests for API endpoints or workflows',
    category: 'testing',
    icon: '🔗',
    promptTemplate: 'Create integration tests for {{target}} in {{repo}}:\n\nTest Scenarios:\n{{scenarios}}\n\nInclude:\n- Setup and teardown\n- Database/API mocking where needed\n- Assertion of side effects\n- Error scenario coverage',
    systemMessage: SYSTEM_PROMPTS.testing,
    reasoningEffort: 'medium',
    estimatedDuration: '15-25 min',
    tags: ['testing', 'integration', 'e2e'],
  },

  // ── Code Review ──────────────────────────────────────────────
  {
    id: 'review-code',
    name: 'Code Review',
    description: 'Perform a thorough code review with actionable feedback',
    category: 'review',
    icon: '👀',
    promptTemplate: 'Perform a thorough code review of {{target}} in {{repo}}:\n\nReview Criteria:\n- Code quality and readability\n- Performance implications\n- Security concerns\n- Error handling completeness\n- Test coverage\n- Documentation quality\n\nProvide specific, actionable feedback with code suggestions.',
    systemMessage: SYSTEM_PROMPTS.codeReview,
    reasoningEffort: 'xhigh',
    estimatedDuration: '5-15 min',
    tags: ['review', 'quality', 'feedback'],
  },

  // ── Documentation ────────────────────────────────────────────
  {
    id: 'docs-api',
    name: 'Generate API Docs',
    description: 'Generate API documentation from code',
    category: 'documentation',
    icon: '📝',
    promptTemplate: 'Generate comprehensive API documentation for {{target}} in {{repo}}:\n\nInclude:\n- Endpoint descriptions\n- Request/response schemas\n- Example requests and responses\n- Error codes and their meanings\n- Authentication requirements',
    systemMessage: SYSTEM_PROMPTS.documentation,
    reasoningEffort: 'medium',
    estimatedDuration: '10-20 min',
    tags: ['documentation', 'api-docs', 'openapi'],
  },
  {
    id: 'docs-readme',
    name: 'Update README',
    description: 'Update or create README with setup and usage instructions',
    category: 'documentation',
    icon: '📄',
    promptTemplate: 'Update the README for {{repo}}:\n\nInclude:\n- Project description\n- Setup instructions (prerequisites, installation, configuration)\n- Usage examples\n- API reference (if applicable)\n- Contributing guidelines\n- License information',
    systemMessage: SYSTEM_PROMPTS.documentation,
    reasoningEffort: 'low',
    estimatedDuration: '5-10 min',
    tags: ['documentation', 'readme', 'setup'],
  },

  // ── Security ─────────────────────────────────────────────────
  {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Perform a security audit and fix vulnerabilities',
    category: 'security',
    icon: '🔒',
    promptTemplate: 'Perform a security audit of {{target}} in {{repo}}:\n\nCheck for:\n- Injection vulnerabilities (SQL, XSS, command)\n- Authentication/authorization issues\n- Sensitive data exposure\n- Insecure dependencies\n- CSRF protection\n- Input validation gaps\n\nProvide fixes for any issues found.',
    systemMessage: SYSTEM_PROMPTS.security,
    reasoningEffort: 'xhigh',
    estimatedDuration: '10-25 min',
    tags: ['security', 'audit', 'vulnerabilities'],
  },
]

// ── Template helpers ───────────────────────────────────────────────

/**
 * Fill template variables with provided values.
 */
export function fillTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

/**
 * Get templates by category.
 */
export function getTemplatesByCategory(category: SDLCCategory): SDLCTemplate[] {
  return SDLC_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get template by ID.
 */
export function getTemplateById(id: string): SDLCTemplate | undefined {
  return SDLC_TEMPLATES.find(t => t.id === id)
}
