import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env vars for bitbucket config
process.env.BITBUCKET_URL = "https://bitbucket.example.com";
process.env.BITBUCKET_USERNAME = "testuser";
process.env.BITBUCKET_TOKEN = "test-token";

import {
  listProjects,
  listRepositories,
  listAllRepositories,
  getRepository,
  getDefaultBranch,
  listBranches,
  createBranch,
  createPullRequest,
  getBitbucketConfig,
} from "../bitbucket-service";

describe("bitbucket-service – coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ values: [] })),
    });
  });

  it("getBitbucketConfig returns env vars", () => {
    const cfg = getBitbucketConfig();
    expect(cfg.baseUrl).toBe("https://bitbucket.example.com");
    expect(cfg.token).toBe("test-token");
  });

  it("listProjects fetches projects", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({ values: [{ key: "PRJ", name: "Project" }] }),
        ),
    });

    const result = await listProjects();
    expect(result).toEqual([{ key: "PRJ", name: "Project" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects?limit=100"),
      expect.any(Object),
    );
  });

  it("listRepositories fetches repos for a project", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(JSON.stringify({ values: [{ slug: "my-repo" }] })),
    });

    const result = await listRepositories("PRJ");
    expect(result).toEqual([{ slug: "my-repo" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/PRJ/repos?limit=100"),
      expect.any(Object),
    );
  });

  it("listAllRepositories fetches all repos across all projects", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({ values: [{ key: "P1" }, { key: "P2" }] }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ values: [{ slug: "repo1" }] })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ values: [{ slug: "repo2" }] })),
      });

    const result = await listAllRepositories();
    expect(result).toHaveLength(2);
  });

  it("getRepository fetches specific repo", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ slug: "my-repo" })),
    });

    const result = await getRepository("PRJ", "my-repo");
    expect(result.slug).toBe("my-repo");
  });

  it("getDefaultBranch fetches default branch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(JSON.stringify({ displayId: "main", isDefault: true })),
    });

    const result = await getDefaultBranch("PRJ", "my-repo");
    expect(result.displayId).toBe("main");
  });

  it("listBranches with filterText", async () => {
    await listBranches("PRJ", "my-repo", "feature");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("filterText=feature"),
      expect.any(Object),
    );
  });

  it("listBranches without filterText", async () => {
    await listBranches("PRJ", "my-repo");
    const url = mockFetch.mock.calls[0][0];
    expect(url).not.toContain("filterText");
  });

  it("createBranch sends POST", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ displayId: "feature/x" })),
    });

    await createBranch("PRJ", "my-repo", "feature/x", "main");
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      name: "feature/x",
      startPoint: "main",
    });
  });

  it("createPullRequest sends POST with correct body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(JSON.stringify({ id: 1, title: "PR", state: "OPEN" })),
    });

    await createPullRequest(
      "PRJ",
      "repo",
      "PR Title",
      "Description",
      "feature",
      "main",
      ["reviewer1"],
    );
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.title).toBe("PR Title");
    expect(body.reviewers).toEqual([{ user: { name: "reviewer1" } }]);
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    await expect(listProjects()).rejects.toThrow("Bitbucket API error 401");
  });

  it("throws when BITBUCKET_URL is not set", async () => {
    const origUrl = process.env.BITBUCKET_URL;
    delete process.env.BITBUCKET_URL;
    await expect(listProjects()).rejects.toThrow(
      "BITBUCKET_URL is not configured",
    );
    process.env.BITBUCKET_URL = origUrl;
  });

  it("returns undefined for empty response body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const result = await getRepository("PRJ", "repo");
    expect(result).toBeUndefined();
  });

  it("handles no auth token", async () => {
    const origToken = process.env.BITBUCKET_TOKEN;
    delete process.env.BITBUCKET_TOKEN;

    await listProjects();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();

    process.env.BITBUCKET_TOKEN = origToken;
  });
});
