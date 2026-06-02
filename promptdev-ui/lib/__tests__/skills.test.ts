import { describe, it, expect } from "vitest";
import {
  SKILLS,
  SKILL_CATEGORIES,
  getSkillsByCategory,
  getDefaultSkillIds,
  getSkillById,
  getInstallCommand,
  buildInstallCommands,
  buildInstallScript,
} from "@/lib/skills";

describe("skills registry", () => {
  it("has at least 10 skills defined", () => {
    expect(SKILLS.length).toBeGreaterThanOrEqual(10);
  });

  it("every skill has required fields", () => {
    for (const skill of SKILLS) {
      expect(skill.id).toBeTruthy();
      expect(skill.label).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.category).toBeTruthy();
      expect(skill.installPackage).toBeTruthy();
      expect(skill.source).toMatch(/^(official|community)$/);
      expect(skill.icon).toBeTruthy();
      expect(skill.tags.length).toBeGreaterThan(0);
      expect(skill.installs).toBeTruthy();
    }
  });

  it("every skill has a unique id", () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every skill category is valid", () => {
    const validCategories = Object.keys(SKILL_CATEGORIES);
    for (const skill of SKILLS) {
      expect(validCategories).toContain(skill.category);
    }
  });

  it("includes react-best-practices as a default-selected skill", () => {
    const skill = SKILLS.find((s) => s.id === "vercel-react-best-practices");
    expect(skill).toBeTruthy();
    expect(skill!.defaultSelected).toBe(true);
    expect(skill!.category).toBe("development");
  });

  it("includes web-design-guidelines as a default-selected skill", () => {
    const skill = SKILLS.find((s) => s.id === "web-design-guidelines");
    expect(skill).toBeTruthy();
    expect(skill!.defaultSelected).toBe(true);
    expect(skill!.category).toBe("design");
  });

  it("includes official skills from multiple repos", () => {
    const officialSkills = SKILLS.filter((s) => s.source === "official");
    expect(officialSkills.length).toBeGreaterThanOrEqual(8);
    const officialIds = officialSkills.map((s) => s.id);
    expect(officialIds).toContain("skill-creator");
    expect(officialIds).toContain("mcp-builder");
    expect(officialIds).toContain("webapp-testing");
    expect(officialIds).toContain("find-skills");
    expect(officialIds).toContain("frontend-design");
    expect(officialIds).toContain("doc-coauthoring");
  });

  it("every skill has a valid installPackage (owner/repo format)", () => {
    for (const skill of SKILLS) {
      expect(skill.installPackage).toMatch(/^[\w-]+\/[\w-]+$/);
    }
  });

  it("uses known install packages", () => {
    const packages = new Set(SKILLS.map((s) => s.installPackage));
    expect(packages).toContain("vercel-labs/agent-skills");
    expect(packages).toContain("anthropics/skills");
    expect(packages).toContain("vercel-labs/skills");
  });
});

describe("SKILL_CATEGORIES", () => {
  it("has all used categories", () => {
    const usedCategories = new Set(SKILLS.map((s) => s.category));
    for (const cat of usedCategories) {
      expect(SKILL_CATEGORIES[cat]).toBeTruthy();
      expect(SKILL_CATEGORIES[cat].label).toBeTruthy();
      expect(typeof SKILL_CATEGORIES[cat].order).toBe("number");
      expect(SKILL_CATEGORIES[cat].description).toBeTruthy();
    }
  });
});

describe("getSkillsByCategory", () => {
  it("returns groups sorted by category order", () => {
    const groups = getSkillsByCategory();
    expect(groups.length).toBeGreaterThan(0);

    const orders = groups.map(
      (g) => SKILL_CATEGORIES[g.category].order,
    );
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
    }
  });

  it("includes all skills in exactly one group", () => {
    const groups = getSkillsByCategory();
    const groupedSkillIds = groups.flatMap((g) => g.skills.map((s) => s.id));
    const sortedGrouped = groupedSkillIds.toSorted((a, b) => a.localeCompare(b));
    const sortedAll = SKILLS.map((s) => s.id).toSorted((a, b) => a.localeCompare(b));
    expect(sortedGrouped).toEqual(sortedAll);
  });

  it("includes category description in each group", () => {
    const groups = getSkillsByCategory();
    for (const group of groups) {
      expect(group.description).toBeTruthy();
    }
  });
});

describe("getDefaultSkillIds", () => {
  it("returns an array of IDs", () => {
    const ids = getDefaultSkillIds();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("includes vercel-react-best-practices", () => {
    expect(getDefaultSkillIds()).toContain("vercel-react-best-practices");
  });

  it("includes web-design-guidelines", () => {
    expect(getDefaultSkillIds()).toContain("web-design-guidelines");
  });

  it("only includes skills that exist", () => {
    const allIds = new Set(SKILLS.map((s) => s.id));
    for (const id of getDefaultSkillIds()) {
      expect(allIds.has(id)).toBe(true);
    }
  });

  it("matches skills marked as defaultSelected", () => {
    const defaults = getDefaultSkillIds();
    const expectedDefaults = SKILLS.filter((s) => s.defaultSelected).map(
      (s) => s.id,
    );
    const sortedDefaults = defaults.toSorted((a, b) => a.localeCompare(b));
    const sortedExpected = expectedDefaults.toSorted((a, b) => a.localeCompare(b));
    expect(sortedDefaults).toEqual(sortedExpected);
  });
});

describe("getSkillById", () => {
  it("returns skill for valid id", () => {
    const skill = getSkillById("vercel-react-best-practices");
    expect(skill).toBeTruthy();
    expect(skill!.id).toBe("vercel-react-best-practices");
    expect(skill!.label).toBe("React Best Practices");
  });

  it("returns undefined for unknown id", () => {
    expect(getSkillById("nonexistent")).toBeUndefined();
  });
});

describe("getInstallCommand", () => {
  it("returns correct npx command for a skill", () => {
    const skill = getSkillById("vercel-react-best-practices")!;
    expect(getInstallCommand(skill)).toBe("npx -y skills add vercel-labs/agent-skills");
  });

  it("returns correct command for anthropics skills", () => {
    const skill = getSkillById("frontend-design")!;
    expect(getInstallCommand(skill)).toBe("npx -y skills add anthropics/skills");
  });
});

describe("buildInstallCommands", () => {
  it("returns empty array for empty input", () => {
    expect(buildInstallCommands("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(buildInstallCommands("  ,  ,  ")).toEqual([]);
  });

  it("returns single command for one skill", () => {
    const cmds = buildInstallCommands("vercel-react-best-practices");
    expect(cmds).toEqual(["npx -y skills add vercel-labs/agent-skills"]);
  });

  it("deduplicates skills from the same package", () => {
    // vercel-react-best-practices and web-design-guidelines both come from vercel-labs/agent-skills
    const cmds = buildInstallCommands("vercel-react-best-practices, web-design-guidelines");
    expect(cmds).toEqual(["npx -y skills add vercel-labs/agent-skills"]);
  });

  it("returns multiple commands for skills from different packages", () => {
    const cmds = buildInstallCommands("vercel-react-best-practices, frontend-design, find-skills");
    expect(cmds).toHaveLength(3);
    expect(cmds).toContain("npx -y skills add vercel-labs/agent-skills");
    expect(cmds).toContain("npx -y skills add anthropics/skills");
    expect(cmds).toContain("npx -y skills add vercel-labs/skills");
  });

  it("ignores unknown skill IDs", () => {
    const cmds = buildInstallCommands("vercel-react-best-practices, unknown-skill");
    expect(cmds).toEqual(["npx -y skills add vercel-labs/agent-skills"]);
  });

  it("trims whitespace from skill IDs", () => {
    const cmds = buildInstallCommands("  vercel-react-best-practices  ,  frontend-design  ");
    expect(cmds).toHaveLength(2);
  });
});

describe("buildInstallScript", () => {
  it("returns empty string for empty input", () => {
    expect(buildInstallScript("")).toBe("");
  });

  it("returns single command without &&", () => {
    const script = buildInstallScript("vercel-react-best-practices");
    expect(script).toBe("npx -y skills add vercel-labs/agent-skills");
    expect(script).not.toContain("&&");
  });

  it("chains multiple commands with &&", () => {
    const script = buildInstallScript("vercel-react-best-practices, frontend-design");
    expect(script).toContain("&&");
    expect(script).toContain("vercel-labs/agent-skills");
    expect(script).toContain("anthropics/skills");
  });
});
