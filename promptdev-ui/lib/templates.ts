/**
 * Task template library for reusable prompt configurations.
 */
import type { CreateTaskRequest } from "@/lib/api";

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "feature"
    | "bugfix"
    | "refactor"
    | "testing"
    | "docs"
    | "security"
    | "custom";
  icon: string;
  prompt: string;
  defaults?: Partial<CreateTaskRequest>;
  tags: string[];
}

export const BUILT_IN_TEMPLATES: TaskTemplate[] = [
  {
    id: "feature-crud",
    name: "CRUD Feature",
    description:
      "Generate a complete CRUD feature with API routes, service layer, and UI components",
    category: "feature",
    icon: "🏗️",
    prompt:
      "Create a complete CRUD feature for {entity}. Include:\n- Database schema with Drizzle ORM\n- API routes (GET, POST, PUT, DELETE)\n- Service layer with validation\n- React components with forms\n- Unit tests for service and API",
    defaults: { iterative: true, maxIterations: 5, reviewEnabled: true },
    tags: ["crud", "full-stack", "api"],
  },
  {
    id: "bugfix-investigate",
    name: "Bug Investigation",
    description: "Investigate and fix a reported bug with root cause analysis",
    category: "bugfix",
    icon: "🐛",
    prompt:
      "Investigate and fix the following bug:\n{description}\n\nSteps:\n1. Identify the root cause\n2. Write a failing test that reproduces the bug\n3. Implement the fix\n4. Verify all existing tests still pass",
    defaults: { iterative: true, maxIterations: 3 },
    tags: ["bugfix", "investigation"],
  },
  {
    id: "refactor-extract",
    name: "Extract & Refactor",
    description: "Extract logic into reusable modules with proper abstractions",
    category: "refactor",
    icon: "♻️",
    prompt:
      "Refactor {target} by:\n1. Extracting shared logic into reusable utilities\n2. Reducing function complexity\n3. Improving type safety\n4. Adding missing error handling\n5. Ensuring all tests pass",
    defaults: { reviewEnabled: true },
    tags: ["refactor", "clean-code"],
  },
  {
    id: "test-coverage",
    name: "Test Coverage Boost",
    description: "Add comprehensive tests to improve coverage for a module",
    category: "testing",
    icon: "🧪",
    prompt:
      "Improve test coverage for {module}:\n1. Identify untested code paths\n2. Write unit tests for edge cases\n3. Add integration tests for key flows\n4. Ensure 90%+ line coverage",
    defaults: { iterative: true, maxIterations: 3 },
    tags: ["testing", "coverage"],
  },
  {
    id: "security-audit",
    name: "Security Audit",
    description: "Perform a security audit and fix vulnerabilities",
    category: "security",
    icon: "🔒",
    prompt:
      "Perform a security audit on {scope}:\n1. Check for injection vulnerabilities\n2. Validate input sanitization\n3. Review authentication/authorization\n4. Check for sensitive data exposure\n5. Fix any issues found",
    defaults: { reviewEnabled: true },
    tags: ["security", "audit"],
  },
  {
    id: "docs-api",
    name: "API Documentation",
    description: "Generate comprehensive API documentation with examples",
    category: "docs",
    icon: "📚",
    prompt:
      "Generate API documentation for {endpoints}:\n1. Document all endpoints with request/response schemas\n2. Add usage examples\n3. Include error codes and handling\n4. Generate OpenAPI/Swagger spec if applicable",
    tags: ["documentation", "api"],
  },
];

export function getTemplatesByCategory(
  category: TaskTemplate["category"],
): TaskTemplate[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.category === category);
}

export function searchTemplates(query: string): TaskTemplate[] {
  const lower = query.toLowerCase();
  return BUILT_IN_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some((tag) => tag.includes(lower)),
  );
}

export function interpolateTemplate(
  template: TaskTemplate,
  vars: Record<string, string>,
): string {
  let result = template.prompt;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
