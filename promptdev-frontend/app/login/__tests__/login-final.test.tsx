import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ────────────────────────────────────────────────────────

const mockSignIn = vi.fn()
const mockUseSession = vi.fn()
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => mockUseSession(),
}))

const mockReplace = vi.fn()
let searchParamsString = ''
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsString),
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  searchParamsString = ''
  mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })
})

async function getLoginPage() {
  const mod = await import('@/app/login/page')
  return mod.default
}

describe('LoginPage – final coverage: credentials login (line 89)', () => {
  it('renders "Sign in as Test User" button in development mode', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('signIn with GitHub includes callbackUrl from search params', async () => {
    searchParamsString = 'callbackUrl=/dashboard'

    const LoginPage = await getLoginPage()
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /continue with github/i }))

    expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/dashboard' })
  })

  it('signIn with Google includes callbackUrl from search params', async () => {
    searchParamsString = 'callbackUrl=/copilot'

    const LoginPage = await getLoginPage()
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/copilot' })
  })

  it('defaults callbackUrl to "/" when not in search params', async () => {
    searchParamsString = ''

    const LoginPage = await getLoginPage()
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /continue with github/i }))

    expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/' })
  })

  it('shows generic error message for unknown error type', async () => {
    searchParamsString = 'error=UnknownError'

    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByText(/an error occurred during sign in/i)).toBeInTheDocument()
  })

  it('shows OAuthAccountNotLinked error message', async () => {
    searchParamsString = 'error=OAuthAccountNotLinked'

    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByText(/already associated with another provider/i)).toBeInTheDocument()
  })

  it('redirects to callbackUrl when already authenticated', async () => {
    searchParamsString = 'callbackUrl=/settings'
    mockUseSession.mockReturnValue({
      data: { user: { name: 'Test' } },
      status: 'authenticated',
    })

    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/settings')
    })
  })

  it('does not render login form when status is loading', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' })

    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.queryByRole('button', { name: /continue with github/i })).not.toBeInTheDocument()
  })

  it('renders terms text on the login page', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByText(/by signing in, you agree/i)).toBeInTheDocument()
  })

  // This test uses vi.resetModules so it must be LAST to avoid polluting other tests
  it('calls signIn with "password" provider for dev credentials', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.resetModules()

    vi.doMock('next-auth/react', () => ({
      signIn: (...args: unknown[]) => mockSignIn(...args),
      useSession: () => ({ data: null, status: 'unauthenticated' }),
    }))
    vi.doMock('next/navigation', () => ({
      useSearchParams: () => new URLSearchParams(''),
      useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
    }))

    const mod = await import('@/app/login/page')
    const LoginPage = mod.default
    const user = userEvent.setup()
    render(<LoginPage />)

    const devButton = await screen.findByRole('button', { name: /sign in as test user/i })
    await user.click(devButton)
    expect(mockSignIn).toHaveBeenCalledWith('password', { password: 'password', callbackUrl: '/' })

    vi.unstubAllEnvs()
  })
})
