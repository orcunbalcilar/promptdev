import { describe, it, expect, vi, beforeEach } from "vitest";

describe("doMock debug", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("checks what executeTask returns", async () => {
    vi.doMock("@/lib/copilot/client", () => ({
      createCopilotSession: vi.fn().mockResolvedValue({ id: "s1" }),
      sendMessage: vi.fn(),
      getSession: vi.fn(),
      destroySession: vi.fn(),
      listAvailableModels: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/copilot/orchestrator/event-tracking", () => ({
      setupEventTracking: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/system-prompt", () => ({
      buildSystemPrompt: vi.fn().mockReturnValue("prompt"),
    }));
    vi.doMock("@/lib/copilot/orchestrator/service-bridge", () => ({
      createWorkspace: vi.fn().mockResolvedValue("/tmp"),
      cloneRepository: vi.fn().mockReturnValue("/tmp/repo"),
      fetchTask: vi.fn().mockResolvedValue({
        id: "t1",
        title: "T",
        prompt: "p",
        modelId: "",
        repositorySlug: "r",
        sourceBranch: "f",
        targetBranch: "m",
        workspaceType: "BITBUCKET",
        projectKey: "P",
      }),
      sendCallback: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/monitoring", () => ({
      registerMonitoringSession: vi.fn(),
      endMonitoringSession: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/jira", () => ({
      addJiraComment: vi.fn(),
      transitionJiraIssue: vi.fn(),
    }));

    const mod = await import("@/lib/copilot/orchestrator/index");
    console.log("Module keys:", Object.keys(mod));
    console.log("executeTask type:", typeof mod.executeTask);
    try {
      const result = await mod.executeTask("t1");
      console.log("Result:", JSON.stringify(result));
    } catch (e) {
      console.log("Caught error:", e);
    }
    expect(mod.executeTask).toBeDefined();
  });
});
