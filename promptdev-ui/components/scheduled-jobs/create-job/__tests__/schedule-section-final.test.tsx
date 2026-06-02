import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
} as unknown as typeof ResizeObserver;

Element.prototype.scrollIntoView = vi.fn();

const mockSetCronExpression = vi.fn();
const mockSetSelectedPreset = vi.fn();
const mockSetStartAt = vi.fn();
const mockSetEnabled = vi.fn();

vi.mock("@/components/scheduled-jobs/create-job/_form-context", () => ({
  useJobForm: () => ({
    cronExpression: "0 0 2 * * *",
    setCronExpression: mockSetCronExpression,
    selectedPreset: "custom",
    setSelectedPreset: mockSetSelectedPreset,
    startAt: "",
    setStartAt: mockSetStartAt,
    enabled: true,
    setEnabled: mockSetEnabled,
  }),
}));

import { ScheduleSection } from "@/components/scheduled-jobs/create-job/schedule-section";

describe("ScheduleSection", () => {
  it("shows custom cron input when preset is 'custom' (lines 107-108)", () => {
    // Lines 107-108: {selectedPreset === "custom" && (<Input ...>)}
    render(<ScheduleSection />);
    const cronInput = screen.getByPlaceholderText("0 0 2 * * MON");
    expect(cronInput).toBeInTheDocument();
    expect(cronInput).toHaveValue("0 0 2 * * *");
  });

  it("renders start date button with placeholder", () => {
    render(<ScheduleSection />);
    expect(screen.getByText("Pick a date")).toBeInTheDocument();
  });
});
