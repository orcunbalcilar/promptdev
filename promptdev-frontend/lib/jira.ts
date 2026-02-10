/**
 * API client for Jira Server integration.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    status: { name: string; id: string };
    assignee?: { name: string; displayName: string; emailAddress?: string };
    priority?: { name: string; id: string };
    issuetype: { name: string; id: string };
    project: { key: string; name: string };
    created: string;
    updated: string;
    labels?: string[];
    reporter?: { name: string; displayName: string };
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  startAt: number;
  maxResults: number;
  total: number;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string; id: string };
}

async function jiraFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}/jira${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API request failed: ${response.status} - ${text}`);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

/**
 * Search Jira issues by JQL.
 */
export async function searchJiraIssues(
  jql: string,
  maxResults = 50,
): Promise<JiraSearchResponse> {
  return jiraFetch<JiraSearchResponse>(
    `/issues/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`,
  );
}

/**
 * Get a specific Jira issue by key.
 */
export async function getJiraIssue(issueKey: string): Promise<JiraIssue> {
  return jiraFetch<JiraIssue>(`/issues/${issueKey}`);
}

/**
 * Get available transitions for an issue.
 */
export async function getJiraTransitions(
  issueKey: string,
): Promise<JiraTransition[]> {
  const response = await jiraFetch<{ transitions: JiraTransition[] }>(
    `/issues/${issueKey}/transitions`,
  );
  return response.transitions ?? [];
}

/**
 * Transition a Jira issue to a new status.
 */
export async function transitionJiraIssue(
  issueKey: string,
  transitionId: string,
): Promise<void> {
  await jiraFetch<void>(`/issues/${issueKey}/transition`, {
    method: "POST",
    body: JSON.stringify({
      transitionId,
    }),
  });
}

/**
 * Add a comment to a Jira issue.
 */
export async function addJiraComment(
  issueKey: string,
  body: string,
): Promise<void> {
  await jiraFetch<void>(`/issues/${issueKey}/comment`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/**
 * Get issues for a specific project.
 */
export async function getJiraProjectIssues(
  projectKey: string,
  maxResults = 50,
): Promise<JiraSearchResponse> {
  return jiraFetch<JiraSearchResponse>(
    `/projects/${projectKey}/issues?maxResults=${maxResults}`,
  );
}
