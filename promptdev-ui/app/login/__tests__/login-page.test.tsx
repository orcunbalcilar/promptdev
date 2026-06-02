import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-auth/react
const mockSignIn = vi.fn();
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => mockUseSession(),
}));

// Mock next/navigation — use mutable var so tests can change search params without vi.resetModules()
const mockReplace = vi.fn();
let searchParamsString = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsString),
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsString = "";
  // Default: unauthenticated session
  mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
});

// Dynamic import after mocks
async function getLoginPage() {
  const mod = await import("@/app/login/page");
  return mod.default;
}

describe("LoginPage", () => {
  it("should render PromptDev branding", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(screen.getByText(/sign in to promptdev/i)).toBeInTheDocument();
  });

  it("should show description text", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(
      screen.getByText(/ai-powered development platform/i),
    ).toBeInTheDocument();
  });

  it("should render GitHub sign-in button", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /continue with github/i }),
    ).toBeInTheDocument();
  });

  it("should render Google sign-in button", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('should call signIn with "github" when GitHub button is clicked', async () => {
    const LoginPage = await getLoginPage();
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /continue with github/i }),
    );

    expect(mockSignIn).toHaveBeenCalledWith("github", { callbackUrl: "/" });
  });

  it('should call signIn with "google" when Google button is clicked', async () => {
    const LoginPage = await getLoginPage();
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("should display error message for OAuthAccountNotLinked", async () => {
    searchParamsString = "error=OAuthAccountNotLinked";

    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(
      screen.getByText(/already associated with another provider/i),
    ).toBeInTheDocument();
  });

  it("should show usage terms text", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(screen.getByText(/by signing in/i)).toBeInTheDocument();
  });

  it("should render sign in title as an h1 heading", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /sign in to promptdev/i }),
    ).toBeInTheDocument();
  });

  it("should render content inside a main landmark", async () => {
    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("should redirect authenticated users to home", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Test" } },
      status: "authenticated",
    });

    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("should show loading spinner while session is loading", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    const LoginPage = await getLoginPage();
    render(<LoginPage />);

    // Should not show sign-in buttons when loading
    expect(
      screen.queryByRole("button", { name: /continue with github/i }),
    ).not.toBeInTheDocument();
  });
});
