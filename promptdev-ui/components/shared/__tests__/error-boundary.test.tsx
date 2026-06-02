import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../error-boundary";

// Suppress console.error for expected error boundary logs
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

function ThrowingComponent({ message }: { message: string }): never {
  throw new Error(message);
}

function ThrowUndefined(): never {
  throw new Error("An unexpected error occurred.");
}

function GoodComponent() {
  return <div>Everything is fine</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  it("catches errors and displays the error message", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error message" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("shows the Try Again button when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Oops" />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("recovers when Try Again is clicked and component no longer throws", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) throw new Error("Temporary error");
      return <div>Recovered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("Recovered successfully")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ThrowingComponent message="Test" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("displays default message when error has no message", () => {
    render(
      <ErrorBoundary>
        <ThrowUndefined />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
