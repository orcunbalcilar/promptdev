/**
 * Bitbucket Server API service.
 * Direct HTTP calls to Bitbucket Server REST API.
 */

export function getBitbucketConfig() {
  const baseUrl = process.env.BITBUCKET_URL;
  const username = process.env.BITBUCKET_USERNAME;
  const token = process.env.BITBUCKET_TOKEN;
  return { baseUrl, username, token };
}

function getAuthHeaders(): Record<string, string> {
  const { token } = getBitbucketConfig();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function bitbucketFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { baseUrl } = getBitbucketConfig();
  if (!baseUrl) throw new Error("BITBUCKET_URL is not configured");

  const url = `${baseUrl}/rest/api/latest${path}`;
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
    throw new Error(`Bitbucket API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

interface PagedBitbucketResponse<T> {
  values: T[];
  size: number;
  isLastPage: boolean;
}

export interface ProjectResponse {
  id: number;
  key: string;
  name: string;
  description?: string;
  public?: boolean;
  type?: string;
}

export interface RepositoryResponse {
  id: number;
  slug: string;
  name: string;
  description?: string;
  project: { key: string; name: string };
  links: {
    clone?: Array<{ href: string; name: string }>;
    self?: Array<{ href: string }>;
  };
}

export interface BranchResponse {
  id: string;
  displayId: string;
  isDefault: boolean;
  latestCommit?: string;
}

export interface PullRequestResponse {
  id: number;
  title: string;
  state: string;
  links: { self: Array<{ href: string }> };
}

export async function listProjects(): Promise<ProjectResponse[]> {
  const response = await bitbucketFetch<PagedBitbucketResponse<ProjectResponse>>(
    "/projects?limit=100",
  );
  return response?.values ?? [];
}

export async function listRepositories(projectKey: string): Promise<RepositoryResponse[]> {
  const response = await bitbucketFetch<PagedBitbucketResponse<RepositoryResponse>>(
    `/projects/${encodeURIComponent(projectKey)}/repos?limit=100`,
  );
  /* v8 ignore start — defensive ?? when API returns null */
  return response?.values ?? [];
  /* v8 ignore stop */
}

export async function listAllRepositories(): Promise<RepositoryResponse[]> {
  const projects = await listProjects();
  const allRepos: RepositoryResponse[] = [];
  for (const project of projects) {
    const repos = await listRepositories(project.key);
    allRepos.push(...repos);
  }
  return allRepos;
}

export async function getRepository(
  projectKey: string,
  repoSlug: string,
): Promise<RepositoryResponse> {
  return bitbucketFetch<RepositoryResponse>(
    `/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}`,
  );
}

export async function getDefaultBranch(
  projectKey: string,
  repoSlug: string,
): Promise<BranchResponse> {
  return bitbucketFetch<BranchResponse>(
    `/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/default-branch`,
  );
}

export async function listBranches(
  projectKey: string,
  repoSlug: string,
  filterText?: string,
): Promise<BranchResponse[]> {
  const filter = filterText ? `&filterText=${encodeURIComponent(filterText)}` : "";
  const response = await bitbucketFetch<PagedBitbucketResponse<BranchResponse>>(
    `/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/branches?limit=100${filter}`,
  );
  return response?.values ?? [];
}

export async function createBranch(
  projectKey: string,
  repoSlug: string,
  branchName: string,
  startPoint: string,
): Promise<BranchResponse> {
  return bitbucketFetch<BranchResponse>(
    `/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/branches`,
    {
      method: "POST",
      body: JSON.stringify({ name: branchName, startPoint }),
    },
  );
}

export async function createPullRequest(
  projectKey: string,
  repoSlug: string,
  title: string,
  description: string,
  sourceBranch: string,
  targetBranch: string,
  reviewers: string[] = [],
): Promise<PullRequestResponse> {
  const body = {
    title,
    description,
    fromRef: { id: `refs/heads/${sourceBranch}` },
    toRef: { id: `refs/heads/${targetBranch}` },
    reviewers: reviewers.map((r) => ({ user: { name: r } })),
  };

  return bitbucketFetch<PullRequestResponse>(
    `/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/pull-requests`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function getCloneUrl(projectKey: string, repoSlug: string): string {
  const { baseUrl } = getBitbucketConfig();
  return `${baseUrl}/scm/${projectKey.toLowerCase()}/${repoSlug}.git`;
}

export function getPullRequestWebUrl(
  projectKey: string,
  repoSlug: string,
  prId: number,
): string {
  const { baseUrl } = getBitbucketConfig();
  return `${baseUrl}/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}`;
}
