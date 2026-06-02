/**
 * Agent Skills Registry — powered by skills.sh
 *
 * Based on the open Agent Skills ecosystem (skills.sh, agentskills.io).
 * Skills are installed into the ephemeral workspace using `npx skills add <owner/repo>`.
 * Each skill provides SKILL.md instructions that the agent loads automatically.
 *
 * Registry entries map to real packages from the skills.sh leaderboard.
 * Installation is a single `npx skills add` command per package.
 *
 * @see https://skills.sh
 * @see https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem
 */

export interface Skill {
  id: string;
  label: string;
  description: string;
  category: SkillCategory;
  /** Whether this skill is selected by default for new tasks */
  defaultSelected: boolean;
  /** Source repository: owner/repo on GitHub */
  source: "official" | "community";
  /** Package path for npx skills add (e.g. "vercel-labs/agent-skills") */
  installPackage: string;
  /** Icon hint for UI rendering */
  icon: SkillIcon;
  /** Tags for search/filtering */
  tags: string[];
  /** Installs count from skills.sh leaderboard (for sorting) */
  installs: string;
}

export type SkillIcon =
  | "code"
  | "globe"
  | "database"
  | "shield"
  | "test-tube"
  | "rocket"
  | "palette"
  | "server"
  | "terminal"
  | "file-text"
  | "search"
  | "brain"
  | "wrench"
  | "blocks"
  | "sparkles"
  | "git-branch";

export type SkillCategory =
  | "development"
  | "testing"
  | "design"
  | "devops"
  | "documents";

export const SKILL_CATEGORIES: Record<
  SkillCategory,
  { label: string; order: number; description: string }
> = {
  development: {
    label: "Development",
    order: 0,
    description:
      "Frameworks, patterns, and best practices for building software",
  },
  testing: {
    label: "Testing & QA",
    order: 1,
    description: "Automated testing, browser testing, and quality assurance",
  },
  design: {
    label: "Design & UI",
    order: 2,
    description: "UI design guidelines, accessibility, and frontend design",
  },
  devops: {
    label: "DevOps & Tools",
    order: 3,
    description: "Deployment, MCP servers, and developer tooling",
  },
  documents: {
    label: "Documents",
    order: 4,
    description: "Document generation, skills authoring",
  },
};

export const SKILLS: Skill[] = [
  // ── Development ───────────────────────────────────────────────
  {
    id: "vercel-react-best-practices",
    label: "React Best Practices",
    description:
      "40+ rules across 8 categories for React & Next.js performance optimization from Vercel Engineering. Covers waterfalls, bundle size, SSR, re-renders, and more.",
    category: "development",
    defaultSelected: true,
    source: "official",
    installPackage: "vercel-labs/agent-skills",
    icon: "code",
    tags: ["react", "next.js", "performance", "vercel", "ssr"],
    installs: "140.4K",
  },
  {
    id: "vercel-composition-patterns",
    label: "Composition Patterns",
    description:
      "React composition patterns that scale. Compound components, state lifting, and internal composition to avoid boolean prop proliferation.",
    category: "development",
    defaultSelected: false,
    source: "official",
    installPackage: "vercel-labs/agent-skills",
    icon: "blocks",
    tags: ["react", "composition", "patterns", "components"],
    installs: "44.2K",
  },
  {
    id: "frontend-design",
    label: "Frontend Design",
    description:
      "Creates polished, accessible UI components with modern CSS, responsive layouts, animation, and design system integration.",
    category: "design",
    defaultSelected: false,
    source: "official",
    installPackage: "anthropics/skills",
    icon: "palette",
    tags: ["css", "design", "ui", "responsive", "accessibility"],
    installs: "75.6K",
  },
  {
    id: "web-design-guidelines",
    label: "Web Design Guidelines",
    description:
      "100+ rules covering accessibility, performance, and UX. Audits for aria-labels, semantic HTML, focus states, forms, animation, typography, and more.",
    category: "design",
    defaultSelected: true,
    source: "official",
    installPackage: "vercel-labs/agent-skills",
    icon: "globe",
    tags: ["accessibility", "ux", "design", "audit", "a11y"],
    installs: "106.2K",
  },
  {
    id: "react-native-guidelines",
    label: "React Native",
    description:
      "React Native best practices for AI agents. 16 rules across 7 sections covering performance, layout, animation, images, state, and platform patterns.",
    category: "development",
    defaultSelected: false,
    source: "official",
    installPackage: "vercel-labs/agent-skills",
    icon: "code",
    tags: ["react-native", "mobile", "expo", "ios", "android"],
    installs: "12.3K",
  },
  {
    id: "remotion-best-practices",
    label: "Remotion",
    description:
      "Best practices for building video with React using Remotion. Covers composition, rendering, performance, and deployment.",
    category: "development",
    defaultSelected: false,
    source: "community",
    installPackage: "remotion-dev/skills",
    icon: "rocket",
    tags: ["remotion", "video", "react", "rendering"],
    installs: "95.6K",
  },
  // ── Testing ───────────────────────────────────────────────────
  {
    id: "webapp-testing",
    label: "Web App Testing",
    description:
      "Automated browser testing using Playwright. E2E flows, visual regression, API testing, Page Object Model, and CI integration.",
    category: "testing",
    defaultSelected: false,
    source: "official",
    installPackage: "anthropics/skills",
    icon: "test-tube",
    tags: ["playwright", "e2e", "browser", "automation", "testing"],
    installs: "28.1K",
  },
  // ── DevOps & Tools ────────────────────────────────────────────
  {
    id: "mcp-builder",
    label: "MCP Server Builder",
    description:
      "Build Model Context Protocol (MCP) servers that expose tools, resources, and prompts to AI agents following the standard.",
    category: "devops",
    defaultSelected: false,
    source: "official",
    installPackage: "anthropics/skills",
    icon: "blocks",
    tags: ["mcp", "model-context-protocol", "tools", "ai-agents"],
    installs: "18.2K",
  },
  {
    id: "vercel-deploy-claimable",
    label: "Vercel Deploy",
    description:
      "Deploy applications to Vercel instantly. Auto-detects 40+ frameworks, returns preview URL and claim URL for ownership transfer.",
    category: "devops",
    defaultSelected: false,
    source: "official",
    installPackage: "vercel-labs/agent-skills",
    icon: "rocket",
    tags: ["deploy", "vercel", "preview", "hosting"],
    installs: "8.5K",
  },
  // ── Documents ─────────────────────────────────────────────────
  {
    id: "doc-coauthoring",
    label: "Doc Co-Authoring",
    description:
      "Collaborative document writing and editing. Structure, refine, and polish technical documents, PRDs, ADRs, and documentation.",
    category: "documents",
    defaultSelected: false,
    source: "official",
    installPackage: "anthropics/skills",
    icon: "file-text",
    tags: ["documents", "writing", "markdown", "prd", "adr"],
    installs: "15.7K",
  },
  {
    id: "find-skills",
    label: "Find Skills",
    description:
      "Discover and install new agent skills. Helps you find the right skill for any task from the skills.sh ecosystem.",
    category: "documents",
    defaultSelected: false,
    source: "official",
    installPackage: "vercel-labs/skills",
    icon: "search",
    tags: ["skills", "discover", "install", "ecosystem"],
    installs: "248.8K",
  },
  {
    id: "skill-creator",
    label: "Skill Creator",
    description:
      "Create new Agent Skills from scratch. Generates SKILL.md files with proper frontmatter, instructions, and optional scripts.",
    category: "documents",
    defaultSelected: false,
    source: "official",
    installPackage: "anthropics/skills",
    icon: "sparkles",
    tags: ["skills", "create", "agent-skills", "authoring"],
    installs: "9.4K",
  },
];

/**
 * Get skills organized by category, sorted by category order.
 */
export function getSkillsByCategory(): Array<{
  category: SkillCategory;
  label: string;
  description: string;
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
      description: SKILL_CATEGORIES[category].description,
      skills,
    }))
    .sort(
      (a, b) =>
        SKILL_CATEGORIES[a.category].order - SKILL_CATEGORIES[b.category].order,
    );
}

/**
 * Get the default selected skill IDs.
 */
export function getDefaultSkillIds(): string[] {
  return SKILLS.filter((s) => s.defaultSelected).map((s) => s.id);
}

/**
 * Look up a skill by ID.
 */
export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

/**
 * Get the `npx skills add` install command for a single skill.
 * Each skill maps to a GitHub repo package; multiple skills from the same
 * repo only need one install command.
 */
export function getInstallCommand(skill: Skill): string {
  return `npx -y skills add ${skill.installPackage}`;
}

/**
 * Build deduplicated install commands for a set of skill IDs.
 * Skills sharing the same `installPackage` are combined into one command.
 * Returns an array of `npx skills add <owner/repo>` commands.
 */
export function buildInstallCommands(skillsStr: string): string[] {
  if (!skillsStr) return [];

  const skillIds = skillsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (skillIds.length === 0) return [];

  const matchedSkills = skillIds
    .map((id) => getSkillById(id))
    .filter((s): s is Skill => s !== undefined);

  // Deduplicate by installPackage
  const packages = [...new Set(matchedSkills.map((s) => s.installPackage))];

  return packages.map((pkg) => `npx -y skills add ${pkg}`);
}

/**
 * Build a single shell command that installs all selected skills.
 * Commands are chained with `&&` so they run sequentially.
 */
export function buildInstallScript(skillsStr: string): string {
  const commands = buildInstallCommands(skillsStr);
  if (commands.length === 0) return "";
  return commands.join(" && ");
}
