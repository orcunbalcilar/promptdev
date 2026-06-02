import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/jira-service", () => ({
  searchIssues: vi.fn(),
  getIssue: vi.fn(),
  addComment: vi.fn(),
  transitionIssue: vi.fn(),
  getTransitions: vi.fn(),
  getIssuesByProject: vi.fn(),
}));

import * as jiraService from "@/lib/services/jira-service";
import { requireAuth } from "@/lib/auth-guard";

import { GET as searchIssuesGET } from "@/app/api/jira/issues/search/route";
import { GET as getIssueGET } from "@/app/api/jira/issues/[issueKey]/route";
import { POST as addCommentPOST } from "@/app/api/jira/issues/[issueKey]/comment/route";
import { POST as transitionPOST } from "@/app/api/jira/issues/[issueKey]/transition/route";
import { GET as getTransitionsGET } from "@/app/api/jira/issues/[issueKey]/transitions/route";
import { GET as projectIssuesGET } from "@/app/api/jira/projects/[projectKey]/issues/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeRequest(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

function makeIssueParams(issueKey: string) {
  return { params: Promise.resolve({ issueKey }) };
}

function makeProjectParams(projectKey: string) {
  return { params: Promise.resolve({ projectKey }) };
}

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

/* ────── Search Issues ────── */

describe("GET /api/jira/issues/search", () => {
  it("searches issues with jql and maxResults", async () => {
    const result = { issues: [{ key: "TEST-1" }], total: 1 };
    vi.mocked(jiraService.searchIssues).mockResolvedValue(result);

    const req = makeRequest("/api/jira/issues/search?jql=project%3DTEST&maxResults=10");
    const res = await searchIssuesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(jiraService.searchIssues).toHaveBeenCalledWith("project=TEST", 10);
  });

  it("uses default maxResults of 50", async () => {
    vi.mocked(jiraService.searchIssues).mockResolvedValue({ issues: [], total: 0 });

    const req = makeRequest("/api/jira/issues/search");
    await searchIssuesGET(req);

    expect(jiraService.searchIssues).toHaveBeenCalledWith("", 50);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/jira/issues/search");
    const res = await searchIssuesGET(req);

    expect(res.status).toBe(401);
  });
});

/* ────── Get Issue ────── */

describe("GET /api/jira/issues/[issueKey]", () => {
  it("returns issue by key", async () => {
    const issue = { key: "TEST-1", summary: "Test issue" };
    vi.mocked(jiraService.getIssue).mockResolvedValue(issue);

    const req = makeRequest("/api/jira/issues/TEST-1");
    const res = await getIssueGET(req, makeIssueParams("TEST-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(issue);
    expect(jiraService.getIssue).toHaveBeenCalledWith("TEST-1");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/jira/issues/TEST-1");
    const res = await getIssueGET(req, makeIssueParams("TEST-1"));

    expect(res.status).toBe(401);
  });
});

/* ────── Add Comment ────── */

describe("POST /api/jira/issues/[issueKey]/comment", () => {
  it("adds comment successfully", async () => {
    vi.mocked(jiraService.addComment).mockResolvedValue(undefined);

    const req = makeRequest("/api/jira/issues/TEST-1/comment", {
      method: "POST",
      body: JSON.stringify({ body: "A comment" }),
      headers: { "content-type": "application/json" },
    });
    const res = await addCommentPOST(req, makeIssueParams("TEST-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(jiraService.addComment).toHaveBeenCalledWith("TEST-1", "A comment");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/jira/issues/TEST-1/comment", {
      method: "POST",
      body: JSON.stringify({ body: "A comment" }),
      headers: { "content-type": "application/json" },
    });
    const res = await addCommentPOST(req, makeIssueParams("TEST-1"));

    expect(res.status).toBe(401);
  });
});

/* ────── Transition Issue ────── */

describe("POST /api/jira/issues/[issueKey]/transition", () => {
  it("transitions issue successfully", async () => {
    vi.mocked(jiraService.transitionIssue).mockResolvedValue(undefined);

    const req = makeRequest("/api/jira/issues/TEST-1/transition", {
      method: "POST",
      body: JSON.stringify({ transitionId: "31" }),
      headers: { "content-type": "application/json" },
    });
    const res = await transitionPOST(req, makeIssueParams("TEST-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(jiraService.transitionIssue).toHaveBeenCalledWith("TEST-1", "31");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/jira/issues/TEST-1/transition", {
      method: "POST",
      body: JSON.stringify({ transitionId: "31" }),
      headers: { "content-type": "application/json" },
    });
    const res = await transitionPOST(req, makeIssueParams("TEST-1"));

    expect(res.status).toBe(401);
  });
});

/* ────── Get Transitions ────── */

describe("GET /api/jira/issues/[issueKey]/transitions", () => {
  it("returns transitions for issue", async () => {
    const transitions = [{ id: "31", name: "Done" }];
    vi.mocked(jiraService.getTransitions).mockResolvedValue(transitions);

    const req = makeRequest("/api/jira/issues/TEST-1/transitions");
    const res = await getTransitionsGET(req, makeIssueParams("TEST-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transitions).toEqual(transitions);
    expect(jiraService.getTransitions).toHaveBeenCalledWith("TEST-1");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/jira/issues/TEST-1/transitions");
    const res = await getTransitionsGET(req, makeIssueParams("TEST-1"));

    expect(res.status).toBe(401);
  });
});

/* ────── Project Issues ────── */

describe("GET /api/jira/projects/[projectKey]/issues", () => {
  it("returns issues for project", async () => {
    const result = { issues: [{ key: "PROJ-1" }], total: 1 };
    vi.mocked(jiraService.getIssuesByProject).mockResolvedValue(result);

    const req = makeRequest("/api/jira/projects/PROJ/issues?maxResults=25");
    const res = await projectIssuesGET(req, makeProjectParams("PROJ"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(jiraService.getIssuesByProject).toHaveBeenCalledWith("PROJ", 25);
  });

  it("uses default maxResults of 50", async () => {
    vi.mocked(jiraService.getIssuesByProject).mockResolvedValue({ issues: [], total: 0 });

    const req = makeRequest("/api/jira/projects/PROJ/issues");
    await projectIssuesGET(req, makeProjectParams("PROJ"));

    expect(jiraService.getIssuesByProject).toHaveBeenCalledWith("PROJ", 50);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/jira/projects/PROJ/issues");
    const res = await projectIssuesGET(req, makeProjectParams("PROJ"));

    expect(res.status).toBe(401);
  });
});
