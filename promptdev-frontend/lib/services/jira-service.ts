/**
 * Jira Server REST API service.
 * Direct HTTP calls to Jira Server.
 */

function getJiraConfig() {
  const baseUrl = process.env.JIRA_URL;
  const username = process.env.JIRA_USERNAME;
  const token = process.env.JIRA_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  return { baseUrl, username, token, projectKey };
}

function getAuthHeaders(): Record<string, string> {
  const { username, token } = getJiraConfig();
  if (!username || !token) return {};
  const credentials = Buffer.from(`${username}:${token}`).toString("base64");
  return { Authorization: `Basic ${credentials}` };
}

export function isJiraConfigured(): boolean {
  const { baseUrl } = getJiraConfig();
  return !!baseUrl;
}

async function jiraApiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { baseUrl } = getJiraConfig();
  if (!baseUrl) throw new Error("JIRA_URL is not configured");

  const url = `${baseUrl}/rest/api/2${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface JiraSearchResult {
  issues: JiraIssueResult[];
  startAt: number;
  maxResults: number;
  total: number;
}

export interface JiraIssueResult {
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

export interface JiraTransitionResult {
  id: string;
  name: string;
  to: { name: string; id: string };
}

export async function searchIssues(
  jql: string,
  startAt = 0,
  maxResults = 50,
): Promise<JiraSearchResult> {
  return jiraApiFetch<JiraSearchResult>(
    `/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}`,
  );
}

export async function getIssue(issueKey: string): Promise<JiraIssueResult> {
  return jiraApiFetch<JiraIssueResult>(`/issue/${encodeURIComponent(issueKey)}`);
}

export async function getTransitions(
  issueKey: string,
): Promise<{ transitions: JiraTransitionResult[] }> {
  return jiraApiFetch<{ transitions: JiraTransitionResult[] }>(
    `/issue/${encodeURIComponent(issueKey)}/transitions`,
  );
}

export async function transitionIssue(
  issueKey: string,
  transitionId: string,
): Promise<void> {
  await jiraApiFetch<void>(`/issue/${encodeURIComponent(issueKey)}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
}

export async function addComment(issueKey: string, comment: string): Promise<void> {
  await jiraApiFetch<void>(`/issue/${encodeURIComponent(issueKey)}/comment`, {
    method: "POST",
    body: JSON.stringify({ body: comment }),
  });
}

export async function assignIssue(issueKey: string, username: string): Promise<void> {
  await jiraApiFetch<void>(`/issue/${encodeURIComponent(issueKey)}/assignee`, {
    method: "PUT",
    body: JSON.stringify({ name: username }),
  });
}

export async function getIssuesByProject(
  projectKey: string,
  startAt = 0,
  maxResults = 50,
): Promise<JiraSearchResult> {
  const jql = `project = ${projectKey} ORDER BY created DESC`;
  return searchIssues(jql, startAt, maxResults);
}

export async function getAssignedIssues(
  username: string,
  startAt = 0,
  maxResults = 50,
): Promise<JiraSearchResult> {
  const jql = `assignee = ${username} AND status != Done ORDER BY priority DESC`;
  return searchIssues(jql, startAt, maxResults);
}
