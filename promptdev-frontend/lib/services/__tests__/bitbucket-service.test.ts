import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.BITBUCKET_URL = "https://bitbucket.example.com";
  process.env.BITBUCKET_USERNAME = "admin";
  process.env.BITBUCKET_TOKEN = "test-token";
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  getBitbucketConfig,
  listProjects,
  listRepositories,
  listBranches,
  getDefaultBranch,
  createBranch,
  createPullRequest,
  getCloneUrl,
  getPullRequestWebUrl,
  getRepository,
} from "../bitbucket-service";

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockErrorResponse(status: number, body: string) {
  return Promise.resolve({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
}

describe("bitbucket-service", () => {
  describe("getBitbucketConfig", () => {
    it("should return config from environment", () => {
      const config = getBitbucketConfig();
      expect(config.baseUrl).toBe("https://bitbucket.example.com");
      expect(config.username).toBe("admin");
      expect(config.token).toBe("test-token");
    });
  });

  describe("listProjects", () => {
    it("should fetch projects with bearer token auth", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({ values: [{ id: 1, key: "PROJ", name: "Project" }] }),
      );

      const projects = await listProjects();

      expect(projects).toEqual([{ id: 1, key: "PROJ", name: "Project" }]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://bitbucket.example.com/rest/api/latest/projects?limit=100",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should return empty array when response has no values", async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ values: [] }));
      const projects = await listProjects();
      expect(projects).toEqual([]);
    });
  });

  describe("listRepositories", () => {
    it("should fetch repos for a project", async () => {
      const repos = [{ id: 1, slug: "my-repo", name: "My Repo" }];
      mockFetch.mockReturnValue(mockJsonResponse({ values: repos }));

      const result = await listRepositories("PROJ");

      expect(result).toEqual(repos);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/PROJ/repos"),
        expect.anything(),
      );
    });
  });

  describe("listBranches", () => {
    it("should fetch branches for a repo", async () => {
      const branches = [{ id: "refs/heads/main", displayId: "main", isDefault: true }];
      mockFetch.mockReturnValue(mockJsonResponse({ values: branches }));

      const result = await listBranches("PROJ", "my-repo");

      expect(result).toEqual(branches);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/PROJ/repos/my-repo/branches"),
        expect.anything(),
      );
    });

    it("should include filter text when provided", async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ values: [] }));

      await listBranches("PROJ", "my-repo", "feature");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("filterText=feature"),
        expect.anything(),
      );
    });
  });

  describe("getDefaultBranch", () => {
    it("should fetch default branch", async () => {
      const branch = { id: "refs/heads/main", displayId: "main", isDefault: true };
      mockFetch.mockReturnValue(mockJsonResponse(branch));

      const result = await getDefaultBranch("PROJ", "my-repo");

      expect(result).toEqual(branch);
    });
  });

  describe("getRepository", () => {
    it("should fetch repository details", async () => {
      const repo = { id: 1, slug: "my-repo", name: "My Repo" };
      mockFetch.mockReturnValue(mockJsonResponse(repo));

      const result = await getRepository("PROJ", "my-repo");

      expect(result).toEqual(repo);
    });
  });

  describe("createBranch", () => {
    it("should POST new branch", async () => {
      const branch = { id: "refs/heads/feature", displayId: "feature", isDefault: false };
      mockFetch.mockReturnValue(mockJsonResponse(branch));

      const result = await createBranch("PROJ", "my-repo", "feature", "main");

      expect(result).toEqual(branch);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/branches"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "feature", startPoint: "main" }),
        }),
      );
    });
  });

  describe("createPullRequest", () => {
    it("should POST new pull request", async () => {
      const pr = { id: 42, title: "My PR", state: "OPEN", links: { self: [{ href: "..." }] } };
      mockFetch.mockReturnValue(mockJsonResponse(pr));

      const result = await createPullRequest(
        "PROJ",
        "my-repo",
        "My PR",
        "Description",
        "feature",
        "main",
      );

      expect(result.id).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/pull-requests"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("getCloneUrl", () => {
    it("should construct clone URL from config", () => {
      const url = getCloneUrl("PROJ", "my-repo");
      expect(url).toBe("https://bitbucket.example.com/scm/proj/my-repo.git");
    });
  });

  describe("getPullRequestWebUrl", () => {
    it("should construct PR web URL", () => {
      const url = getPullRequestWebUrl("PROJ", "my-repo", 42);
      expect(url).toBe(
        "https://bitbucket.example.com/projects/PROJ/repos/my-repo/pull-requests/42",
      );
    });
  });

  describe("error handling", () => {
    it("should throw on HTTP error", async () => {
      mockFetch.mockReturnValue(mockErrorResponse(401, "Unauthorized"));

      await expect(listProjects()).rejects.toThrow("Bitbucket API error 401");
    });

    it("should throw when BITBUCKET_URL is not configured", async () => {
      delete process.env.BITBUCKET_URL;
      // Need to re-import because config is read at call time
      await expect(listProjects()).rejects.toThrow("BITBUCKET_URL is not configured");
    });
  });
});
