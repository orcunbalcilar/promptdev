import {
  BUILT_IN_TEMPLATES,
  getTemplatesByCategory,
  searchTemplates,
  interpolateTemplate,
} from "@/lib/templates";

describe("templates", () => {
  describe("BUILT_IN_TEMPLATES", () => {
    it("should have 6 built-in templates", () => {
      expect(BUILT_IN_TEMPLATES).toHaveLength(6);
    });

    it("should have unique IDs", () => {
      const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should have required fields on every template", () => {
      for (const template of BUILT_IN_TEMPLATES) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.prompt).toBeTruthy();
        expect(template.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getTemplatesByCategory", () => {
    it("should return templates for a given category", () => {
      const features = getTemplatesByCategory("feature");
      expect(features.length).toBeGreaterThan(0);
      expect(features.every((t) => t.category === "feature")).toBe(true);
    });

    it("should return empty array for category with no templates", () => {
      const custom = getTemplatesByCategory("custom");
      expect(custom).toHaveLength(0);
    });
  });

  describe("searchTemplates", () => {
    it("should find templates by name", () => {
      const results = searchTemplates("CRUD");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("feature-crud");
    });

    it("should find templates by tag", () => {
      const results = searchTemplates("security");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find templates by description", () => {
      const results = searchTemplates("root cause");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for non-matching query", () => {
      const results = searchTemplates("xyznonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("interpolateTemplate", () => {
    it("should replace template variables", () => {
      const template = BUILT_IN_TEMPLATES.find((t) => t.id === "feature-crud")!;
      const result = interpolateTemplate(template, { entity: "User" });
      expect(result).toContain("User");
      expect(result).not.toContain("{entity}");
    });

    it("should replace multiple variables", () => {
      const template = BUILT_IN_TEMPLATES.find((t) => t.id === "bugfix-investigate")!;
      const result = interpolateTemplate(template, { description: "Login fails on mobile" });
      expect(result).toContain("Login fails on mobile");
    });

    it("should leave unmatched variables as-is", () => {
      const template = BUILT_IN_TEMPLATES.find((t) => t.id === "feature-crud")!;
      const result = interpolateTemplate(template, {});
      expect(result).toContain("{entity}");
    });
  });
});
