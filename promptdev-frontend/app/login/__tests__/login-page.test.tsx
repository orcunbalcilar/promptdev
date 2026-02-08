import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-auth/react
const mockSignIn = vi.fn()
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// Dynamic import after mocks
async function getLoginPage() {
  const mod = await import('@/app/login/page')
  return mod.default
}

describe('LoginPage', () => {
  it('should render PromptDev branding', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByText(/sign in to promptdev/i)).toBeInTheDocument()
  })

  it('should show description text', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByText(/ai-powered development platform/i)).toBeInTheDocument()
  })

  it('should render GitHub sign-in button', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()
  })

  it('should render Google sign-in button', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('should call signIn with "github" when GitHub button is clicked', async () => {
    const LoginPage = await getLoginPage()
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /continue with github/i }))

    expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/' })
  })

  it('should call signIn with "google" when Google button is clicked', async () => {
    const LoginPage = await getLoginPage()
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })

  it('should display error message for OAuthAccountNotLinked', async () => {
    vi.mocked(await import('next/navigation')).useSearchParams = () =>
      new URLSearchParams('error=OAuthAccountNotLinked') as ReturnType<typeof URLSearchParams.prototype.entries> & URLSearchParams

    // Re-mock with error params
    vi.doMock('next/navigation', () => ({
      useSearchParams: () => new URLSearchParams('error=OAuthAccountNotLinked'),
      useRouter: () => ({ push: vi.fn() }),
    }))

    // Clear module cache so it picks up new mock
    vi.resetModules()
    vi.mock('next-auth/react', () => ({
      signIn: (...args: unknown[]) => mockSignIn(...args),
    }))

    const mod = await import('@/app/login/page')
    const LoginPage = mod.default
    render(<LoginPage />)

    expect(screen.getByText(/already associated with another provider/i)).toBeInTheDocument()
  })

  it('should show usage terms text', async () => {
    const LoginPage = await getLoginPage()
    render(<LoginPage />)

    expect(screen.getByText(/by signing in/i)).toBeInTheDocument()
  })
})
