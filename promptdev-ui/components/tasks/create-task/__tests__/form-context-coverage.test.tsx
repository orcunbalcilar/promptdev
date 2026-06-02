import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────

const mockGetProjects = vi.fn().mockResolvedValue([]);
const mockGetRepositories = vi.fn().mockResolvedValue([]);
const mockGetBranches = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/api", () => ({
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  getRepositories: (...args: unknown[]) => mockGetRepositories(...args),
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
}));

vi.mock("@/lib/copilot/models", () => ({
  DEFAULT_MODEL_ID: "gpt-5.2",
}));

vi.mock("@/lib/skills", () => ({
  getDefaultSkillIds: () => ["skill-a", "skill-b"],
  buildInstallScript: (s: string) => (s ? `install ${s}` : ""),
}));

import { TaskFormProvider, useTaskForm } from "../_form-context";

// ── Helpers ────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function ContextConsumer({
  onCtx,
}: {
  onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
}) {
  const ctx = useTaskForm();
  onCtx(ctx);
  return <div data-testid="consumer">ok</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === "/api/copilot/models") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ models: [{ id: "m1", name: "M1" }] }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  }) as unknown as typeof fetch;
});

// ── Tests ──────────────────────────────────────────────────────

describe("TaskFormProvider / useTaskForm – uncovered paths", () => {
  it("throws when useTaskForm is used outside provider (lines 103-104)", () => {
    function Bare() {
      useTaskForm();
      return null;
    }
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <QueryClientProvider client={createQueryClient()}>
          <Bare />
        </QueryClientProvider>,
      ),
    ).toThrow("useTaskForm must be used within <TaskFormProvider>");
    spy.mockRestore();
  });

  it("fetches copilot models when open (lines 144-146)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;
    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <ContextConsumer onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(captured!.modelsLoading).toBe(false);
    });
    expect(captured!.models).toEqual([{ id: "m1", name: "M1" }]);
  });

  it("returns empty models when fetch is not ok (lines 144-146 !res.ok)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    let captured: ReturnType<typeof useTaskForm> | null = null;
    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <ContextConsumer onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(captured!.modelsLoading).toBe(false);
    });
    expect(captured!.models).toEqual([]);
  });

  it("derives effectiveProjectKey from repository (line 178)", async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "my-repo", project: { key: "PROJ", name: "Project" } },
    ]);

    let captured: ReturnType<typeof useTaskForm> | null = null;

    function Updater({
      onCtx,
    }: {
      onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button onClick={() => ctx.setSelectedRepo("my-repo")}>
          select-repo
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <Updater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(captured!.reposLoading).toBe(false);
    });

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("select-repo"));

    await waitFor(() => {
      expect(captured!.effectiveProjectKey).toBe("PROJ");
    });
  });

  it("resolves target branch from default branch (lines 199-200)", async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "my-repo", project: { key: "PROJ", name: "P" } },
    ]);
    mockGetBranches.mockResolvedValue([
      { id: "refs/heads/develop", displayId: "develop", isDefault: true },
      { id: "refs/heads/main", displayId: "main", isDefault: false },
    ]);

    let captured: ReturnType<typeof useTaskForm> | null = null;

    function BranchUpdater({
      onCtx,
    }: {
      onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button onClick={() => ctx.setSelectedRepo("my-repo")}>
          select-repo
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <BranchUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("select-repo"));

    // Wait for branches to load and resolve target
    await waitFor(() => {
      expect(captured!.selectedTargetBranch).toBe("develop");
    });
  });

  it("builds create request with LOCAL + newProjectName (lines 234-240)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function FormUpdater({
      onCtx,
    }: {
      onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setWorkspaceType("LOCAL");
            ctx.setNewProjectName("my-app");
            ctx.setNewProjectDir("/home/user/projects");
            ctx.setTitle("Test");
            ctx.setPrompt("Do stuff");
          }}
        >
          setup
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <FormUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("setup"));

    await waitFor(() => {
      expect(captured!.workspaceType).toBe("LOCAL");
    });

    const request = captured!.buildCreateRequest(new FormData());
    expect(request.repositorySlug).toBe("my-app");
    expect(request.workspacePath).toBe("/home/user/projects/my-app");
    expect(request.workspaceType).toBe("LOCAL");
  });

  it("builds create request with Jira commit pattern (line 258)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function JiraUpdater({
      onCtx,
    }: {
      onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setTitle("Fix bug");
            ctx.setPrompt("Fix it");
            ctx.setJiraIssueKey("PROJ-123");
          }}
        >
          set-jira
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <JiraUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("set-jira"));

    await waitFor(() => {
      expect(captured!.jiraIssueKey).toBe("PROJ-123");
    });

    const request = captured!.buildCreateRequest(new FormData());
    expect(request.commitMessagePattern).toBe("[PROJ-123] {message}");
  });

  it("prepends Jira key when commitMessagePattern exists but doesn't include key (line 258 else-if)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function PatternUpdater({
      onCtx,
    }: {
      onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setTitle("Fix");
            ctx.setPrompt("P");
            ctx.setJiraIssueKey("PROJ-456");
            ctx.setCommitMessagePattern("feat: {message}");
          }}
        >
          set-pattern
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <PatternUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("set-pattern"));

    await waitFor(() => {
      expect(captured!.commitMessagePattern).toBe("feat: {message}");
    });

    const request = captured!.buildCreateRequest(new FormData());
    expect(request.commitMessagePattern).toBe("[PROJ-456] feat: {message}");
  });

  it("builds create request with LOCAL path fallback (else branch)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function LocalUpdater({
      onCtx,
    }: {
      onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setWorkspaceType("LOCAL");
            ctx.setLocalPath("/home/user/existing-project");
            ctx.setTitle("T");
            ctx.setPrompt("P");
          }}
        >
          set-local
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <LocalUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("set-local"));

    await waitFor(() => {
      expect(captured!.localPath).toBe("/home/user/existing-project");
    });

    const request = captured!.buildCreateRequest(new FormData());
    expect(request.repositorySlug).toBe("/home/user/existing-project");
    expect(request.workspacePath).toBe("/home/user/existing-project");
  });

  it("handleSetTargetBranch sets userChangedTarget and updates target branch (lines 199-200)", async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "my-repo", project: { key: "PK", name: "P" } },
    ]);
    mockGetBranches.mockResolvedValue([
      { id: "refs/heads/develop", displayId: "develop", isDefault: true },
      { id: "refs/heads/main", displayId: "main", isDefault: false },
    ]);

    let captured: ReturnType<typeof useTaskForm> | null = null;

    function TargetBranchUpdater({
      onCtx,
    }: {
      readonly onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <div>
          <span data-testid="target">{ctx.selectedTargetBranch}</span>
          <button
            onClick={() => {
              ctx.setSelectedRepo("my-repo");
            }}
          >
            select-repo
          </button>
          <button
            onClick={() => {
              // This calls handleSetTargetBranch (lines 199-200)
              ctx.setSelectedTargetBranch("custom-branch");
            }}
          >
            set-target
          </button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <TargetBranchUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();

    // First select repo so branches load
    await user.click(screen.getByText("select-repo"));

    await waitFor(() => {
      // effectiveTargetBranch should resolve to default branch "develop"
      expect(captured!.selectedTargetBranch).toBe("develop");
    });

    // Now call handleSetTargetBranch via setSelectedTargetBranch (lines 199-200)
    await user.click(screen.getByText("set-target"));

    await waitFor(() => {
      // After user explicitly changed target, it should stick to the user's choice
      expect(captured!.selectedTargetBranch).toBe("custom-branch");
    });
  });

  it("models fetch returns empty when response has no models field (line 146)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    let captured: ReturnType<typeof useTaskForm> | null = null;
    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <ContextConsumer onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(captured!.modelsLoading).toBe(false);
    });
    expect(captured!.models).toEqual([]);
  });

  it("buildCreateRequest with iterative=true and completionCriteria (lines 275-277)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function IterativeUpdater({
      onCtx,
    }: {
      readonly onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setTitle("Iter task");
            ctx.setPrompt("Do iteratively");
            ctx.setIterative(true);
            ctx.setMaxIterations(5);
          }}
        >
          set-iterative
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <IterativeUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("set-iterative"));

    await waitFor(() => {
      expect(captured!.iterative).toBe(true);
    });

    // Build with completionCriteria in formData
    const fd = new FormData();
    fd.set("completionCriteria", "All tests pass");
    const request = captured!.buildCreateRequest(fd);
    expect(request.iterative).toBe(true);
    expect(request.maxIterations).toBe(5);
    expect(request.completionCriteria).toBe("All tests pass");
  });

  it("buildCreateRequest with iterative=true but empty completionCriteria (line 277 || undefined)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function IterativeUpdater2({
      onCtx,
    }: {
      readonly onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setTitle("T");
            ctx.setPrompt("P");
            ctx.setIterative(true);
          }}
        >
          set-iter
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <IterativeUpdater2 onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("set-iter"));

    await waitFor(() => {
      expect(captured!.iterative).toBe(true);
    });

    // Empty formData → completionCriteria is null → || undefined
    const request = captured!.buildCreateRequest(new FormData());
    expect(request.completionCriteria).toBeUndefined();
  });

  it("buildCreateRequest with LOCAL + empty newProjectDir falls back to /tmp (line 236)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function EmptyDirUpdater({
      onCtx,
    }: {
      readonly onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setWorkspaceType("LOCAL");
            ctx.setNewProjectName("app");
            ctx.setNewProjectDir(""); // empty → fallback to "/tmp"
            ctx.setTitle("T");
            ctx.setPrompt("P");
          }}
        >
          setup-empty-dir
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <EmptyDirUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("setup-empty-dir"));

    await waitFor(() => {
      expect(captured!.newProjectName).toBe("app");
    });

    const request = captured!.buildCreateRequest(new FormData());
    expect(request.repositorySlug).toBe("app");
    expect(request.workspacePath).toBe("/tmp/app");
  });

  it("buildCreateRequest with empty skills and bootScript (lines 284-285)", async () => {
    let captured: ReturnType<typeof useTaskForm> | null = null;

    function MinimalUpdater({
      onCtx,
    }: {
      readonly onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button
          onClick={() => {
            ctx.setTitle("Min");
            ctx.setPrompt("P");
            ctx.setSkills("");
            ctx.setBootScript("");
          }}
        >
          set-minimal
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <MinimalUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();
    await user.click(screen.getByText("set-minimal"));

    await waitFor(() => {
      expect(captured!.skills).toBe("");
    });

    const request = captured!.buildCreateRequest(new FormData());
    expect(request.skills).toBeUndefined();
    expect(request.bootScript).toBeUndefined();
  });

  it("effectiveProjectKey falls back to empty when repo has no project key (line 178)", async () => {
    mockGetRepositories.mockResolvedValue([{ slug: "bare-repo" }]);

    let captured: ReturnType<typeof useTaskForm> | null = null;

    function BareRepoUpdater({
      onCtx,
    }: {
      readonly onCtx: (ctx: ReturnType<typeof useTaskForm>) => void;
    }) {
      const ctx = useTaskForm();
      onCtx(ctx);
      return (
        <button onClick={() => ctx.setSelectedRepo("bare-repo")}>
          select-bare
        </button>
      );
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <TaskFormProvider open={true}>
          <BareRepoUpdater onCtx={(ctx) => (captured = ctx)} />
        </TaskFormProvider>
      </QueryClientProvider>,
    );

    const user = (await import("@testing-library/user-event")).default.setup();

    await waitFor(() => {
      expect(captured!.reposLoading).toBe(false);
    });

    await user.click(screen.getByText("select-bare"));

    await waitFor(() => {
      expect(captured!.effectiveProjectKey).toBe("");
    });
  });
});
