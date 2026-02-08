/**
 * API client for user profile and settings.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: string
  bitbucketUrl?: string
  bitbucketProjectKey?: string
  bitbucketUsername?: string
  bitbucketTokenSet: boolean
  copilotTokenSet: boolean
  byokProviderType?: string
  byokBaseUrl?: string
  byokApiKeySet: boolean
}

export interface UpdateUserSettingsRequest {
  bitbucketUrl?: string
  bitbucketProjectKey?: string
  bitbucketUsername?: string
  /** Raw token — encrypted server-side before storage */
  bitbucketToken?: string
  /** Raw token — encrypted server-side before storage */
  copilotToken?: string
  /** BYOK provider type (openai, azure, anthropic) */
  byokProviderType?: string
  /** BYOK provider base URL */
  byokBaseUrl?: string
  /** BYOK API key — encrypted server-side before storage */
  byokApiKey?: string
  /** Azure API version (for azure provider type) */
  byokAzureApiVersion?: string
}

async function userFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`User API request failed: ${response.status} - ${text}`)
  }

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

/**
 * Get user profile.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  return userFetch<UserProfile>(`/users/${userId}/profile`)
}

/**
 * Update user settings (Bitbucket info, Copilot token, etc.).
 */
export async function updateUserSettings(
  userId: string,
  request: UpdateUserSettingsRequest,
): Promise<UserProfile> {
  return userFetch<UserProfile>(`/users/${userId}/settings`, {
    method: "PUT",
    body: JSON.stringify(request),
  })
}

/**
 * Sync user from OAuth provider (find or create).
 */
export async function syncUser(params: {
  provider: string
  providerAccountId: string
  email: string
  name?: string
  avatarUrl?: string
}): Promise<UserProfile> {
  const searchParams = new URLSearchParams({
    provider: params.provider,
    providerAccountId: params.providerAccountId,
    email: params.email,
  })
  if (params.name) searchParams.set("name", params.name)
  if (params.avatarUrl) searchParams.set("avatarUrl", params.avatarUrl)

  return userFetch<UserProfile>(`/users/sync?${searchParams.toString()}`, {
    method: "POST",
  })
}
