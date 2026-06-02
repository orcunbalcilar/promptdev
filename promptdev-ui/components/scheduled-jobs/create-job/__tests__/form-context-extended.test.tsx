/**
 * form-context-extended.test.tsx — covers JobFormProvider context,
 * createJob mutation, resetForm, SDLC template derivation, and query data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Radix / jsdom stubs ─────────────────────────────────────────

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

Element.prototype.hasPointerCapture =
  Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture =
  Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture =
  Element.prototype.releasePointerCapture ?? (() => {});
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => {});

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    createPortal: (children: React.ReactNode) => children,
  };
});

// ── Mock API calls ──────────────────────────────────────────────

const mockCreateScheduledJob = vi.fn();
const mockGetProjects = vi.fn();
const mockGetRepositories = vi.fn();
const mockGetBranches = vi.fn();

vi.mock("@/lib/api", () => ({
  createScheduledJob: (...args: unknown[]) => mockCreateScheduledJob(...args),
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  getRepositories: (...args: unknown[]) => mockGetRepositories(...args),
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
}));

vi.mock("@/lib/copilot/models", () => ({
  DEFAULT_MODEL_ID: "gpt-4o",
}));

vi.mock("@/lib/sdlc", () => ({
  getTemplateById: (id: string) =>
    id === "tmpl-1" ? { id: "tmpl-1", name: "Template 1" } : undefined,
}));

vi.mock("../../constants", () => ({
  JOB_TYPE_TEMPLATE_IDS: {
    MAINTENANCE: ["tmpl-1"],
    CODE_REVIEW: [],
    TEST_COVERAGE: [],
    SECURITY_AUDIT: [],
    PERFORMANCE: [],
    DOCUMENTATION: [],
    CUSTOM: [],
  },
}));

// ── Import component ────────────────────────────────────────────

import { JobFormProvider, useJobForm } from "../_form-context";

// ── Helpers ─────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// Helper component that exposes form context for testing
function FormConsumer({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useJobForm>) => void;
}) {
  const ctx = useJobForm();
  onContext(ctx);
  return (
    <div>
      <span data-testid="name">{ctx.name}</span>
      <span data-testid="job-type">{ctx.jobType}</span>
      <span data-testid="model">{ctx.selectedModel}</span>
      <span data-testid="creating">{String(ctx.isCreating)}</span>
      <span data-testid="templates">{ctx.sdlcTemplates.length}</span>
      <span data-testid="max-iterations">{ctx.maxIterations}</span>
      <span data-testid="workspace-type">{ctx.workspaceType}</span>
    </div>
  );
}

function renderProvider(props?: { open?: boolean; onClose?: () => void }) {
  const open = props?.open ?? true;
  const onClose = props?.onClose ?? vi.fn();
  let contextRef: ReturnType<typeof useJobForm> | null = null;

  const result = render(
    <QueryClientProvider client={createQueryClient()}>
      <JobFormProvider open={open} onClose={onClose}>
        <FormConsumer
          onContext={(ctx) => {
            contextRef = ctx;
          }}
        />
      </JobFormProvider>
    </QueryClientProvider>,
  );

  return { ...result, getContext: () => contextRef!, onClose };
}

// ── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProjects.mockResolvedValue([]);
  mockGetRepositories.mockResolvedValue([]);
  mockGetBranches.mockResolvedValue([]);
  mockCreateScheduledJob.mockResolvedValue({ id: "job-1" });

  // Mock global fetch for copilot models
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ models: [{ id: "gpt-4o", name: "GPT-4o" }] }),
  } as Response);
});

// ── Tests ───────────────────────────────────────────────────────

describe("JobFormProvider – initial state", () => {
  it("provides default form state", () => {
    const { getContext } = renderProvider();
    const ctx = getContext();

    expect(ctx.name).toBe("");
    expect(ctx.description).toBe("");
    expect(ctx.promptTemplate).toBe("");
    expect(ctx.jobType).toBe("MAINTENANCE");
    expect(ctx.cronExpression).toBe("0 0 2 * * *");
    expect(ctx.enabled).toBe(true);
    expect(ctx.workspaceType).toBe("BITBUCKET");
    expect(ctx.selectedModel).toBe("gpt-4o");
    expect(ctx.maxIterations).toBe(10);
    expect(screen.getByTestId("name")).toHaveTextContent("");
  });

  it("derives SDLC templates from jobType", () => {
    renderProvider();
    expect(screen.getByTestId("templates")).toHaveTextContent("1");
  });
});

describe("JobFormProvider – state setters", () => {
  it("updates name", async () => {
    const { getContext } = renderProvider();

    act(() => {
      getContext().setName("My Job");
    });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("My Job");
    });
  });

  it("updates jobType and recomputes templates", async () => {
    const { getContext } = renderProvider();

    act(() => {
      getContext().setJobType("CODE_REVIEW");
    });

    await waitFor(() => {
      expect(screen.getByTestId("job-type")).toHaveTextContent("CODE_REVIEW");
      expect(screen.getByTestId("templates")).toHaveTextContent("0");
    });
  });

  it("updates maxIterations", async () => {
    const { getContext } = renderProvider();

    act(() => {
      getContext().setMaxIterations(5);
    });

    await waitFor(() => {
      expect(screen.getByTestId("max-iterations")).toHaveTextContent("5");
    });
  });

  it("updates workspace type", async () => {
    const { getContext } = renderProvider();

    act(() => {
      getContext().setWorkspaceType("LOCAL");
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-type")).toHaveTextContent("LOCAL");
    });
  });
});

describe("JobFormProvider – resetForm", () => {
  it("resets all fields to defaults", async () => {
    const { getContext } = renderProvider();

    // Change some values
    act(() => {
      const ctx = getContext();
      ctx.setName("Changed");
      ctx.setDescription("Desc");
      ctx.setJobType("CUSTOM");
      ctx.setMaxIterations(3);
      ctx.setWorkspaceType("LOCAL");
      ctx.setLocalPath("/some/path");
      ctx.setSelectedModel("claude-3");
    });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Changed");
    });

    // Reset
    act(() => {
      getContext().resetForm();
    });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("");
      expect(screen.getByTestId("job-type")).toHaveTextContent("MAINTENANCE");
      expect(screen.getByTestId("max-iterations")).toHaveTextContent("10");
      expect(screen.getByTestId("workspace-type")).toHaveTextContent(
        "BITBUCKET",
      );
      expect(screen.getByTestId("model")).toHaveTextContent("gpt-4o");
    });
  });
});

describe("JobFormProvider – createJob", () => {
  it("calls createScheduledJob with form data", async () => {
    const onClose = vi.fn();
    const { getContext } = renderProvider({ onClose });

    act(() => {
      const ctx = getContext();
      ctx.setName("Test Job");
      ctx.setPromptTemplate("Do stuff");
      ctx.setSelectedRepo("my-repo");
    });

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Test Job");
    });

    act(() => {
      getContext().createJob();
    });

    await waitFor(() => {
      expect(mockCreateScheduledJob).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Job",
          promptTemplate: "Do stuff",
          workspaceRef: "my-repo",
          cronExpression: "0 0 2 * * *",
          jobType: "MAINTENANCE",
          maxIterations: 10,
          enabled: true,
        }),
      );
    });

    // On success, should close and reset
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("sends LOCAL workspace ref correctly", async () => {
    const { getContext } = renderProvider();

    act(() => {
      const ctx = getContext();
      ctx.setName("Local Job");
      ctx.setWorkspaceType("LOCAL");
      ctx.setLocalPath("/home/project");
      ctx.setPromptTemplate("Build");
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-type")).toHaveTextContent("LOCAL");
    });

    act(() => {
      getContext().createJob();
    });

    await waitFor(() => {
      expect(mockCreateScheduledJob).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceType: "LOCAL",
          workspaceRef: "/home/project",
          projectKey: undefined,
        }),
      );
    });
  });
});

describe("JobFormProvider – branch syncing", () => {
  it("fetches branches and syncs source/target when default is not main (lines 168, 183-184)", async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "my-repo", project: { key: "PROJ", name: "Project" } },
    ]);
    mockGetBranches.mockResolvedValue([
      { id: "refs/heads/develop", displayId: "develop", isDefault: true },
      { id: "refs/heads/main", displayId: "main", isDefault: false },
    ]);

    const { getContext } = renderProvider();

    // Set selectedProject and selectedRepo to enable branches query (enabled: open && BITBUCKET && selectedRepo.length > 0 && effectiveProjectKey.length > 0)
    act(() => {
      const ctx = getContext();
      ctx.setSelectedProject("PROJ");
      ctx.setSelectedRepo("my-repo");
    });

    // Wait for getBranches query to fire (line 168)
    await waitFor(() => {
      expect(mockGetBranches).toHaveBeenCalledWith("my-repo", "PROJ");
    });

    // Lines 183-184: useEffect syncs source/target branches to non-main default
    await waitFor(() => {
      const ctx = getContext();
      expect(ctx.sourceBranch).toBe("develop");
      expect(ctx.targetBranch).toBe("develop");
    });
  });

  it('does not sync branches when default is "main"', async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "repo-a", project: { key: "PK", name: "P" } },
    ]);
    mockGetBranches.mockResolvedValue([
      { id: "refs/heads/main", displayId: "main", isDefault: true },
    ]);

    const { getContext } = renderProvider();

    act(() => {
      const ctx = getContext();
      ctx.setSelectedProject("PK");
      ctx.setSelectedRepo("repo-a");
    });

    await waitFor(() => {
      expect(mockGetBranches).toHaveBeenCalled();
    });

    // sourceBranch should stay "main" (no effect triggered)
    const ctx = getContext();
    expect(ctx.sourceBranch).toBe("main");
    expect(ctx.targetBranch).toBe("main");
  });

  it("derives effectiveProjectKey from repository when selectedProject is empty", async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "my-repo", project: { key: "DERIVED", name: "Derived Project" } },
    ]);

    const { getContext } = renderProvider();

    // Leave selectedProject empty, set selectedRepo for fallback derivation
    act(() => {
      getContext().setSelectedRepo("my-repo");
    });

    await waitFor(() => {
      expect(getContext().effectiveProjectKey).toBe("DERIVED");
    });
  });

  it("falls back to empty string when repo has no project key", async () => {
    mockGetRepositories.mockResolvedValue([{ slug: "bare-repo" }]);

    const { getContext } = renderProvider();

    act(() => {
      getContext().setSelectedRepo("bare-repo");
    });

    await waitFor(() => {
      expect(getContext().effectiveProjectKey).toBe("");
    });
  });

  it("falls back to first branch displayId when no default branch (line 175)", async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "repo-x", project: { key: "PX", name: "PX" } },
    ]);
    mockGetBranches.mockResolvedValue([
      { id: "refs/heads/feature", displayId: "feature", isDefault: false },
      { id: "refs/heads/hotfix", displayId: "hotfix", isDefault: false },
    ]);

    const { getContext } = renderProvider();

    act(() => {
      const ctx = getContext();
      ctx.setSelectedProject("PX");
      ctx.setSelectedRepo("repo-x");
    });

    // With no isDefault branch, should fall back to first branch displayId
    await waitFor(() => {
      expect(getContext().sourceBranch).toBe("feature");
    });
  });

  it('falls back to "main" when branches have no displayId (line 175 ?? "main")', async () => {
    mockGetRepositories.mockResolvedValue([
      { slug: "repo-y", project: { key: "PY", name: "PY" } },
    ]);
    // Branches with no displayId at all
    mockGetBranches.mockResolvedValue([
      { id: "refs/heads/orphan", isDefault: false },
    ]);

    const { getContext } = renderProvider();

    act(() => {
      const ctx = getContext();
      ctx.setSelectedProject("PY");
      ctx.setSelectedRepo("repo-y");
    });

    await waitFor(() => {
      expect(mockGetBranches).toHaveBeenCalled();
    });

    // branches.find(b => b.isDefault)?.displayId → undefined
    // branches[0]?.displayId → undefined
    // ?? "main" fallback kicks in
    // Since defaultBranchId is "main" and sourceBranch is already "main", effect doesn't fire
    const ctx = getContext();
    expect(ctx.sourceBranch).toBe("main");
    expect(ctx.targetBranch).toBe("main");
  });

  it("handles copilot models fetch failure (line 139 !res.ok)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const { getContext } = renderProvider();

    await waitFor(() => {
      expect(getContext().modelsLoading).toBe(false);
    });

    expect(getContext().models).toEqual([]);
  });

  it("handles copilot models response with no models field (line 141)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const { getContext } = renderProvider();

    await waitFor(() => {
      expect(getContext().modelsLoading).toBe(false);
    });

    expect(getContext().models).toEqual([]);
  });
});

describe("JobFormProvider – useJobForm outside provider", () => {
  it("throws when used outside provider", () => {
    const Oops = () => {
      useJobForm();
      return null;
    };

    expect(() => render(<Oops />)).toThrow(/JobFormProvider/);
  });
});
