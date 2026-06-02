import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unused-vars */
vi.mock("@/components/ui/button", () => ({
  Button: (props: Record<string, unknown>) => {
    const { variant, size, asChild, children, ...rest } = props;
    return (
      <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children as React.ReactNode}
      </button>
    );
  },
}));

vi.mock("@/components/ui/switch", () => {
  function MockSwitch(props: Record<string, unknown>) {
    const { checked, onCheckedChange, ...rest } = props;
    const htmlProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        role="switch"
        aria-checked="false"
        onClick={() => (onCheckedChange as (v: boolean) => void)?.(!checked)}
        {...htmlProps}
      />
    );
  }
  return { Switch: MockSwitch };
});

vi.mock("@/components/ui/badge", () => ({
  Badge: (props: Record<string, unknown>) => {
    const { variant, children, ...rest } = props;
    return (
      <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)}>
        {children as React.ReactNode}
      </span>
    );
  },
}));
/* eslint-enable @typescript-eslint/no-unused-vars */

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  CheckIcon: () => <svg data-testid="check-icon" />,
  CopyIcon: () => <svg data-testid="copy-icon" />,
  EyeIcon: () => <svg data-testid="eye-icon" />,
  EyeOffIcon: () => <svg data-testid="eye-off-icon" />,
}));

import {
  EnvironmentVariables,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
  EnvironmentVariablesContent,
  EnvironmentVariable,
  EnvironmentVariableGroup,
  EnvironmentVariableName,
  EnvironmentVariableValue,
  EnvironmentVariableCopyButton,
  EnvironmentVariableRequired,
} from "@/components/ai-elements/environment-variables";

describe("EnvironmentVariables — uncovered lines", () => {
  // Line 197: EnvironmentVariablesToggle switches show/hide
  it("toggles value visibility via switch", async () => {
    const user = userEvent.setup();
    const onShowValuesChange = vi.fn();

    render(
      <EnvironmentVariables onShowValuesChange={onShowValuesChange}>
        <EnvironmentVariablesHeader>
          <EnvironmentVariablesTitle />
          <EnvironmentVariablesToggle />
        </EnvironmentVariablesHeader>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="API_KEY" value="secret123">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
            </EnvironmentVariableGroup>
            <EnvironmentVariableValue />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    expect(screen.getByText("•".repeat(9))).toBeInTheDocument();

    const toggle = screen.getByRole("switch", {
      name: "Toggle value visibility",
    });
    await user.click(toggle);

    expect(onShowValuesChange).toHaveBeenCalledWith(true);
  });

  // Line 271: EnvironmentVariableValue shows masked value
  it("shows masked value when showValues is false", () => {
    render(
      <EnvironmentVariables defaultShowValues={false}>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="SECRET" value="my-secret-key">
            <EnvironmentVariableValue />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    expect(screen.getByText("•".repeat(13))).toBeInTheDocument();
  });

  // Lines 279-280: shows actual value when showValues is true
  it("shows actual value when showValues is true", () => {
    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="SECRET" value="actual-value">
            <EnvironmentVariableValue />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    expect(screen.getByText("actual-value")).toBeInTheDocument();
  });

  // Line 289: EnvironmentVariableCopyButton copies value
  it("copies variable value to clipboard", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <EnvironmentVariables>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="MY_VAR" value="my-value">
            <EnvironmentVariableName />
            <EnvironmentVariableCopyButton onCopy={onCopy} />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("my-value");
    });
    expect(onCopy).toHaveBeenCalled();
  });

  // EnvironmentVariableCopyButton with copyFormat="export"
  it("copies as export format", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <EnvironmentVariables>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="DB_URL" value="postgres://localhost">
            <EnvironmentVariableCopyButton copyFormat="export" />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'export DB_URL="postgres://localhost"'
      );
    });
  });

  // EnvironmentVariableCopyButton with copyFormat="name"
  it("copies variable name only", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <EnvironmentVariables>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="TOKEN" value="abc">
            <EnvironmentVariableCopyButton copyFormat="name" />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("TOKEN");
    });
  });

  // EnvironmentVariableRequired renders
  it("renders required badge", () => {
    render(
      <EnvironmentVariables>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="REQUIRED_VAR" value="">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableRequired />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  // Default EnvironmentVariable renders name and value without custom children
  it("renders default variable layout without custom children", () => {
    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="AUTO_VAR" value="auto-value" />
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    expect(screen.getByText("AUTO_VAR")).toBeInTheDocument();
    expect(screen.getByText("auto-value")).toBeInTheDocument();
  });

  // Lines 279-280: copyToClipboard when clipboard API is unavailable
  it("calls onError when clipboard API not available", async () => {
    const user = userEvent.setup();
    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const onError = vi.fn();

    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="KEY" value="val">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableCopyButton onError={onError} />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Clipboard API not available" })
    );

    Object.defineProperty(navigator, "clipboard", {
      value: origClipboard,
      writable: true,
      configurable: true,
    });
  });

  // Line 289: copyToClipboard catch path
  it("calls onError when clipboard write fails", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("Write error"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const onError = vi.fn();

    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="KEY" value="val">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableCopyButton onError={onError} />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  // EnvironmentVariableCopyButton with copyFormat="export" 
  it("copies in export format", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="DB_HOST" value="localhost">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableCopyButton copyFormat="export" />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('export DB_HOST="localhost"');
    });
  });

  // EnvironmentVariableCopyButton with copyFormat="name" 
  it("copies in name format", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="DB_HOST" value="localhost">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableCopyButton copyFormat="name" />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("DB_HOST");
    });
  });

  // Line 287: setTimeout callback resets isCopied after timeout
  it("resets isCopied after timeout elapses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="TIMER_KEY" value="timerval">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableCopyButton timeout={300} />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    );

    await user.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledTimes(1);

    // Advance past timeout to fire () => setIsCopied(false)
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // After timeout, clicking again should copy again
    await user.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
