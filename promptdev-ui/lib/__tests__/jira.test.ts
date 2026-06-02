import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchJiraIssues,
  getJiraIssue,
  getJiraTransitions,
  transitionJiraIssue,
  addJiraComment,
  getJiraProjectIssues,
} from "@/lib/jira";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function errorResponse(status: number, body = "Error") {
  return {
    ok: false,
    status,
    statusText: "Error",
    text: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Jira API Client", () => {
  describe("searchJiraIssues", () => {
    it("should search issues by JQL query", async () => {
      const response = {
        issues: [{ id: "1", key: "PROJ-123", fields: { summary: "Fix bug" } }],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      mockFetch.mockResolvedValue(jsonResponse(response));

      const result = await searchJiraIssues("project = PROJ AND status = Open");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/jira/issues/search");
      expect(url).toContain("jql=");
      expect(url).toContain("maxResults=50");
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].key).toBe("PROJ-123");
    });

    it("should use custom maxResults", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ issues: [], total: 0 }));

      await searchJiraIssues("project = PROJ", 10);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("maxResults=10");
    });

    it("should encode JQL in URL", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ issues: [], total: 0 }));

      await searchJiraIssues('project = PROJ AND assignee = "john doe"');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain(
        encodeURIComponent('project = PROJ AND assignee = "john doe"'),
      );
    });
  });

  describe("getJiraIssue", () => {
    it("should fetch issue by key", async () => {
      const issue = {
        id: "1",
        key: "PROJ-456",
        fields: {
          summary: "Implement feature",
          status: { name: "In Progress", id: "3" },
        },
      };
      mockFetch.mockResolvedValue(jsonResponse(issue));

      const result = await getJiraIssue("PROJ-456");

      expect(mockFetch.mock.calls[0][0]).toContain("/jira/issues/PROJ-456");
      expect(result.key).toBe("PROJ-456");
      expect(result.fields.summary).toBe("Implement feature");
    });

    it("should throw on 404", async () => {
      mockFetch.mockResolvedValue(errorResponse(404, "Issue not found"));

      await expect(getJiraIssue("PROJ-999")).rejects.toThrow(
        "Jira API request failed: 404",
      );
    });
  });

  describe("getJiraTransitions", () => {
    it("should fetch available transitions", async () => {
      const response = {
        transitions: [
          {
            id: "11",
            name: "Start Work",
            to: { name: "In Progress", id: "3" },
          },
          { id: "21", name: "Done", to: { name: "Done", id: "5" } },
        ],
      };
      mockFetch.mockResolvedValue(jsonResponse(response));

      const result = await getJiraTransitions("PROJ-123");

      expect(mockFetch.mock.calls[0][0]).toContain(
        "/jira/issues/PROJ-123/transitions",
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Start Work");
    });

    it("should return empty array when no transitions field", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}));

      const result = await getJiraTransitions("PROJ-123");

      expect(result).toEqual([]);
    });
  });

  describe("transitionJiraIssue", () => {
    it("should POST transition request", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}));

      await transitionJiraIssue("PROJ-123", "11");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/jira/issues/PROJ-123/transition");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.transitionId).toBe("11");
    });
  });

  describe("addJiraComment", () => {
    it("should POST comment to issue", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}));

      await addJiraComment("PROJ-123", "PR created: https://example.com/pr/1");

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/jira/issues/PROJ-123/comment");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.body).toBe("PR created: https://example.com/pr/1");
    });
  });

  describe("getJiraProjectIssues", () => {
    it("should fetch issues by project key", async () => {
      const response = {
        issues: [
          { id: "1", key: "PROJ-1", fields: { summary: "Issue 1" } },
          { id: "2", key: "PROJ-2", fields: { summary: "Issue 2" } },
        ],
        total: 2,
      };
      mockFetch.mockResolvedValue(jsonResponse(response));

      const result = await getJiraProjectIssues("PROJ");

      expect(mockFetch.mock.calls[0][0]).toContain(
        "/jira/projects/PROJ/issues",
      );
      expect(result.issues).toHaveLength(2);
    });

    it("should use custom maxResults", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ issues: [], total: 0 }));

      await getJiraProjectIssues("PROJ", 25);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("maxResults=25");
    });
  });

  describe("error handling", () => {
    it("should throw on server error", async () => {
      mockFetch.mockResolvedValue(errorResponse(500, "Internal error"));

      await expect(searchJiraIssues("project = PROJ")).rejects.toThrow(
        "Jira API request failed: 500",
      );
    });

    it("should throw on unauthorized", async () => {
      mockFetch.mockResolvedValue(errorResponse(401, "Unauthorized"));

      await expect(getJiraIssue("PROJ-1")).rejects.toThrow(
        "Jira API request failed: 401",
      );
    });
  });
});
