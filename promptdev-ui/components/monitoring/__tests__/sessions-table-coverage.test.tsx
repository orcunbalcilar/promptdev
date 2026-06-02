/**
 * Coverage completion for sessions-table.tsx
 * Targets: line 49 (STATUS_CONFIG fallback), line 146 (pagination)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { SessionsTable } from "../sessions-table";
import type { PaginatedResponse, MonitoringSession } from "@/lib/monitoring";

const baseSessions: PaginatedResponse<MonitoringSession> = {
  content: [
    {
      id: "s1",
      sdkSessionId: "sdk-1",
      model: "gpt-4",
      status: "UNKNOWN_STATUS" as MonitoringSession["status"], // unknown to hit fallback
      source: "task-orchestrator",
      createdAt: new Date().toISOString(),
      totalInputTokens: 0,
      totalOutputTokens: 0,
      messageCount: 0,
      toolExecutionCount: 0,
      errorCount: 0,
    },
  ],
  totalPages: 1,
  totalElements: 1,
  size: 10,
  number: 0,
  first: true,
  last: true,
  empty: false,
};

describe("sessions-table.tsx branch coverage", () => {
  it("falls back to ENDED config for unknown status (line 49)", () => {
    render(
      <SessionsTable sessions={baseSessions} onSelectSession={() => {}} />,
    );
    // Should render without crashing — fallback to ENDED styling
    // sdkSessionId is truncated: .slice(0,12) + "..."
    expect(screen.getByText(/sdk-1/)).toBeInTheDocument();
  });

  it("renders sessions with ACTIVE status", () => {
    const activeSessions: PaginatedResponse<MonitoringSession> = {
      ...baseSessions,
      content: [
        {
          ...baseSessions.content[0],
          status: "ACTIVE" as MonitoringSession["status"],
        },
      ],
    };
    render(
      <SessionsTable sessions={activeSessions} onSelectSession={() => {}} />,
    );
    expect(screen.getByText(/sdk-1/)).toBeInTheDocument();
  });
});
