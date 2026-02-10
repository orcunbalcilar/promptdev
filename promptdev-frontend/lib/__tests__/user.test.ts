import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserProfile, updateUserSettings, syncUser } from '@/lib/user'

// Mock global fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('User API Client', () => {
  describe('getUserProfile', () => {
    it('should fetch user profile by ID', async () => {
      const profileData = {
        id: 'user-123',
        email: 'dev@example.com',
        name: 'Test Dev',
        provider: 'github',
        bitbucketTokenSet: false,
        copilotTokenSet: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(profileData)),
      })

      const result = await getUserProfile('user-123')

      expect(result).toEqual(profileData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123/profile'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      })

      await expect(getUserProfile('unknown-id')).rejects.toThrow('User API request failed: 404')
    })
  })

  describe('updateUserSettings', () => {
    it('should send PUT request with settings', async () => {
      const updatedProfile = {
        id: 'user-123',
        email: 'dev@example.com',
        name: 'Test Dev',
        provider: 'github',
        bitbucketUrl: 'https://bitbucket.new.com',
        bitbucketTokenSet: true,
        copilotTokenSet: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(updatedProfile)),
      })

      const result = await updateUserSettings('user-123', {
        bitbucketUrl: 'https://bitbucket.new.com',
        bitbucketToken: 'my-secret-token',
      })

      expect(result.bitbucketUrl).toBe('https://bitbucket.new.com')
      expect(result.bitbucketTokenSet).toBe(true)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123/settings'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            bitbucketUrl: 'https://bitbucket.new.com',
            bitbucketToken: 'my-secret-token',
          }),
        }),
      )
    })

    it('should send Jira settings in PUT request', async () => {
      const updatedProfile = {
        id: 'user-123',
        email: 'dev@example.com',
        name: 'Test Dev',
        provider: 'github',
        bitbucketTokenSet: false,
        copilotTokenSet: false,
        jiraUrl: 'https://jira.company.com',
        jiraProjectKey: 'PROJ',
        jiraUsername: 'jirauser',
        jiraTokenSet: true,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(updatedProfile)),
      })

      const result = await updateUserSettings('user-123', {
        jiraUrl: 'https://jira.company.com',
        jiraProjectKey: 'PROJ',
        jiraUsername: 'jirauser',
        jiraToken: 'jira-pat-token',
      })

      expect(result.jiraUrl).toBe('https://jira.company.com')
      expect(result.jiraProjectKey).toBe('PROJ')
      expect(result.jiraUsername).toBe('jirauser')
      expect(result.jiraTokenSet).toBe(true)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.jiraUrl).toBe('https://jira.company.com')
      expect(body.jiraProjectKey).toBe('PROJ')
      expect(body.jiraUsername).toBe('jirauser')
      expect(body.jiraToken).toBe('jira-pat-token')
    })

    it('should handle profile with all Jira fields populated', async () => {
      const fullProfile = {
        id: 'user-123',
        email: 'dev@example.com',
        name: 'Test Dev',
        provider: 'github',
        bitbucketTokenSet: true,
        copilotTokenSet: true,
        jiraUrl: 'https://jira.myco.com',
        jiraProjectKey: 'DEV',
        jiraUsername: 'admin',
        jiraTokenSet: true,
        byokApiKeySet: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(fullProfile)),
      })

      const result = await getUserProfile('user-123')

      expect(result.jiraUrl).toBe('https://jira.myco.com')
      expect(result.jiraProjectKey).toBe('DEV')
      expect(result.jiraUsername).toBe('admin')
      expect(result.jiraTokenSet).toBe(true)
    })
  })

  describe('syncUser', () => {
    it('should send POST request with provider info', async () => {
      const profileData = {
        id: 'user-123',
        email: 'dev@example.com',
        name: 'Dev',
        provider: 'github',
        bitbucketTokenSet: false,
        copilotTokenSet: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(profileData)),
      })

      const result = await syncUser({
        provider: 'github',
        providerAccountId: 'gh-12345',
        email: 'dev@example.com',
        name: 'Dev',
      })

      expect(result.email).toBe('dev@example.com')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/sync'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should include optional params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 'user-1' })),
      })

      await syncUser({
        provider: 'github',
        providerAccountId: 'gh-999',
        email: 'user@example.com',
        name: 'User Name',
        avatarUrl: 'https://avatar.example.com/img',
      })

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('name=User+Name')
      expect(callUrl).toContain('avatarUrl=')
    })
  })
})
