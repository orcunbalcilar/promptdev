import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.JIRA_URL = "https://jira.example.com";
  process.env.JIRA_USERNAME = "admin";
  process.env.JIRA_TOKEN = "jira-token";
  process.env.JIRA_PROJECT_KEY = "PROJ";
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  isJiraConfigured,
  searchIssues,
  getIssue,
  getTransitions,
  transitionIssue,
  addComment,
  assignIssue,
  getIssuesByProject,
  getAssignedIssues,
} from "../jira-service";

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockEmptyResponse(status = 204) {
  return Promise.resolve({
    ok: true,
    status,
    text: () => Promise.resolve(""),
  });
}

describe("jira-service", () => {
  describe("isJiraConfigured", () => {
    it("should return true when JIRA_URL is set", () => {
      expect(isJiraConfigured()).toBe(true);
    });

    it("should return false when JIRA_URL is not set", () => {
      delete process.env.JIRA_URL;
      expect(isJiraConfigured()).toBe(false);
    });
  });

  describe("searchIssues", () => {
    it("should search with JQL and basic auth", async () => {
      const searchResult = {
        issues: [{ id: "1", key: "PROJ-1", fields: { summary: "Test" } }],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      mockFetch.mockReturnValue(mockJsonResponse(searchResult));

      const result = await searchIssues("project = PROJ");

      expect(result).toEqual(searchResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/rest/api/2/search?jql="),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Basic "),
          }),
        }),
      );
    });

    it("should encode JQL in URL", async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ issues: [], total: 0 }));

      await searchIssues("status = 'In Progress'");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("status = 'In Progress'")),
        expect.anything(),
      );
    });
  });

  describe("getIssue", () => {
    it("should fetch issue by key", async () => {
      const issue = { id: "1", key: "PROJ-1", fields: { summary: "Bug fix" } };
      mockFetch.mockReturnValue(mockJsonResponse(issue));

      const result = await getIssue("PROJ-1");

      expect(result).toEqual(issue);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/issue/PROJ-1"),
        expect.anything(),
      );
    });
  });

  describe("getTransitions", () => {
    it("should return transitions object", async () => {
      const transitions = {
        transitions: [
          {
            id: "21",
            name: "In Progress",
            to: { name: "In Progress", id: "3" },
          },
          { id: "31", name: "Done", to: { name: "Done", id: "5" } },
        ],
      };
      mockFetch.mockReturnValue(mockJsonResponse(transitions));

      const result = await getTransitions("PROJ-1");

      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0].name).toBe("In Progress");
    });
  });

  describe("transitionIssue", () => {
    it("should POST transition", async () => {
      mockFetch.mockReturnValue(mockEmptyResponse());

      await transitionIssue("PROJ-1", "21");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/issue/PROJ-1/transitions"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ transition: { id: "21" } }),
        }),
      );
    });
  });

  describe("addComment", () => {
    it("should POST comment", async () => {
      mockFetch.mockReturnValue(mockEmptyResponse());

      await addComment("PROJ-1", "This is a comment");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/issue/PROJ-1/comment"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: "This is a comment" }),
        }),
      );
    });
  });

  describe("assignIssue", () => {
    it("should PUT assignment", async () => {
      mockFetch.mockReturnValue(mockEmptyResponse());

      await assignIssue("PROJ-1", "developer");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/issue/PROJ-1/assignee"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "developer" }),
        }),
      );
    });
  });

  describe("getIssuesByProject", () => {
    it("should search with project JQL", async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ issues: [], total: 0 }));

      await getIssuesByProject("PROJ");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("project = PROJ")),
        expect.anything(),
      );
    });
  });

  describe("getAssignedIssues", () => {
    it("should search with assignee JQL", async () => {
      mockFetch.mockReturnValue(mockJsonResponse({ issues: [], total: 0 }));

      await getAssignedIssues("developer");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("assignee = developer")),
        expect.anything(),
      );
    });
  });

  describe("error handling", () => {
    it("should throw on HTTP error with response body", async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Issue not found"),
        }),
      );

      await expect(getIssue("PROJ-999")).rejects.toThrow(
        "Jira API error 404: Issue not found",
      );
    });

    it("should throw when JIRA_URL is not configured", async () => {
      delete process.env.JIRA_URL;
      await expect(searchIssues("test")).rejects.toThrow(
        "JIRA_URL is not configured",
      );
    });
  });
});
