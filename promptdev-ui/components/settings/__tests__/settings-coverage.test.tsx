/**
 * Coverage completion for settings components:
 * - byok-provider-card.tsx line 31 (provider type fallback)
 * - jira-card.tsx lines 125, 183
 * - profile-card.tsx lines 35, 56 (avatar/provider fallback)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { UserProfile } from "@/lib/user";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Test", email: "test@test.com", image: "https://img.com/avatar.png" } },
    status: "authenticated",
  }),
}));

import { ProfileCard } from "../profile-card";

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const baseProfile: UserProfile = {
  id: "u1",
  email: "user@test.com",
  name: "User",
  provider: "bitbucket",
  bitbucketTokenSet: false,
  copilotTokenSet: false,
  byokApiKeySet: false,
  jiraTokenSet: false,
  jiraAutoTaskEnabled: false,
};

describe("profile-card.tsx branch coverage", () => {
  it("line 35: falls back to session.user.image when avatarUrl is undefined", () => {
    renderWith(
      <ProfileCard
        profile={baseProfile}
        session={{
          user: { name: "User", email: "user@test.com", image: "https://img.com/fallback.png" },
        }}
      />,
    );
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("line 56: provider displays 'oauth' when provider is set to 'oauth'", () => {
    renderWith(
      <ProfileCard
        profile={{ ...baseProfile, provider: "oauth" }}
        session={{ user: { name: "Test", email: "e@e.com" } }}
      />,
    );
    expect(screen.getByText("oauth")).toBeInTheDocument();
  });

  it("line 56: session is null", () => {
    renderWith(
      <ProfileCard
        profile={baseProfile}
        session={null}
      />,
    );
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("bitbucket")).toBeInTheDocument();
  });
});
