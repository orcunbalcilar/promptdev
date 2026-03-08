import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileCard } from "../profile-card";
import type { UserProfile } from "@/lib/user";

const mockProfile: UserProfile = {
  id: "user-1",
  email: "alice@example.com",
  name: "Alice Smith",
  avatarUrl: "https://example.com/avatar.png",
  provider: "github",
  bitbucketTokenSet: false,
  copilotTokenSet: false,
  byokApiKeySet: false,
  jiraTokenSet: false,
  jiraAutoTaskEnabled: false,
};

const mockSession = {
  user: {
    name: "Alice Smith",
    email: "alice@example.com",
    image: "https://example.com/session-avatar.png",
  },
};

describe("ProfileCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Profile heading", () => {
    render(<ProfileCard profile={mockProfile} session={mockSession} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders the user name", () => {
    render(<ProfileCard profile={mockProfile} session={mockSession} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("renders the user email", () => {
    render(<ProfileCard profile={mockProfile} session={mockSession} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders the provider badge", () => {
    render(<ProfileCard profile={mockProfile} session={mockSession} />);
    expect(screen.getByText("github")).toBeInTheDocument();
  });

  it("renders avatar fallback from name initial", () => {
    render(
      <ProfileCard
        profile={{ ...mockProfile, avatarUrl: undefined }}
        session={{ user: { name: null, email: null, image: null } }}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("falls back to session name when profile name is missing", () => {
    const profileNoName = {
      ...mockProfile,
      name: undefined as unknown as string,
    };
    render(<ProfileCard profile={profileNoName} session={mockSession} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("falls back to session email when profile email is missing", () => {
    const profileNoEmail = {
      ...mockProfile,
      email: undefined as unknown as string,
    };
    render(<ProfileCard profile={profileNoEmail} session={mockSession} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders description with provider name", () => {
    render(<ProfileCard profile={mockProfile} session={mockSession} />);
    // "github" appears in both the badge and the description text
    const matches = screen.getAllByText(/github/);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("handles null session gracefully", () => {
    render(<ProfileCard profile={mockProfile} session={null} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });
});
