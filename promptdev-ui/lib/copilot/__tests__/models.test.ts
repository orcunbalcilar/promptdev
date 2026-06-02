import { describe, it, expect } from "vitest";
import {
  COPILOT_MODELS,
  DEFAULT_MODEL_ID,
  type CopilotModel,
} from "../models";

describe("models", () => {
  describe("COPILOT_MODELS", () => {
    it("should export a non-empty array of models", () => {
      expect(Array.isArray(COPILOT_MODELS)).toBe(true);
      expect(COPILOT_MODELS.length).toBeGreaterThan(0);
    });

    it("should have unique model IDs", () => {
      const ids = COPILOT_MODELS.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(COPILOT_MODELS)(
      "model $id should have required properties",
      (model: CopilotModel) => {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(model.provider).toBeTruthy();
        expect(model.capabilities).toBeDefined();
        expect(typeof model.capabilities.reasoning).toBe("boolean");
        expect(typeof model.capabilities.vision).toBe("boolean");
      },
    );

    it("should contain models from expected providers", () => {
      const providers = new Set(COPILOT_MODELS.map((m) => m.provider));
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("google");
    });

    it("should include known model IDs", () => {
      const ids = COPILOT_MODELS.map((m) => m.id);
      expect(ids).toContain("gpt-5.2");
      expect(ids).toContain("gpt-5-mini");
      expect(ids).toContain("claude-sonnet-4.5");
      expect(ids).toContain("gemini-2.5-pro");
      expect(ids).toContain("o4-mini");
    });
  });

  describe("DEFAULT_MODEL_ID", () => {
    it("should be a string", () => {
      expect(typeof DEFAULT_MODEL_ID).toBe("string");
    });

    it("should match one of the COPILOT_MODELS ids", () => {
      const ids = COPILOT_MODELS.map((m) => m.id);
      expect(ids).toContain(DEFAULT_MODEL_ID);
    });

    it("should be gpt-5-mini", () => {
      expect(DEFAULT_MODEL_ID).toBe("gpt-5-mini");
    });
  });

  describe("CopilotModel interface conformance", () => {
    it("should allow valid provider values", () => {
      const validProviders = ["openai", "anthropic", "google", "xai", "custom"];
      for (const model of COPILOT_MODELS) {
        expect(validProviders).toContain(model.provider);
      }
    });

    it("should have boolean capability flags", () => {
      for (const model of COPILOT_MODELS) {
        expect(typeof model.capabilities.reasoning).toBe("boolean");
        expect(typeof model.capabilities.vision).toBe("boolean");
      }
    });
  });
});
