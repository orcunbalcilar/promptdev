import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecurityNoteCard } from "../security-note-card";

describe("SecurityNoteCard", () => {
  it("renders the security note title", () => {
    render(<SecurityNoteCard />);
    expect(screen.getByText("Security note")).toBeInTheDocument();
  });

  it("mentions AES-256-GCM encryption", () => {
    render(<SecurityNoteCard />);
    expect(screen.getByText(/AES-256-GCM/)).toBeInTheDocument();
  });

  it("mentions that tokens are encrypted before storage", () => {
    render(<SecurityNoteCard />);
    expect(screen.getByText(/encrypted/i)).toBeInTheDocument();
  });

  it("mentions tokens are not returned in API responses", () => {
    render(<SecurityNoteCard />);
    expect(
      screen.getByText(/never returned in API responses/i),
    ).toBeInTheDocument();
  });

  it("mentions boolean indicator for token status", () => {
    render(<SecurityNoteCard />);
    expect(
      screen.getByText(/boolean indicator/i),
    ).toBeInTheDocument();
  });
});
