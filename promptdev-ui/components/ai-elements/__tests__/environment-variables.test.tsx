import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import {
  EnvironmentVariables,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
  EnvironmentVariablesContent,
  EnvironmentVariable,
  EnvironmentVariableName,
  EnvironmentVariableValue,
  EnvironmentVariableCopyButton,
  EnvironmentVariableRequired,
} from "@/components/ai-elements/environment-variables";

describe("EnvironmentVariables", () => {
  it("renders children", () => {
    render(
      <EnvironmentVariables>
        <span>Env vars content</span>
      </EnvironmentVariables>,
    );
    expect(screen.getByText("Env vars content")).toBeInTheDocument();
  });
});

describe("EnvironmentVariablesTitle", () => {
  it("renders default text", () => {
    render(<EnvironmentVariablesTitle />);
    expect(screen.getByText("Environment Variables")).toBeInTheDocument();
  });

  it("renders custom text", () => {
    render(<EnvironmentVariablesTitle>Custom Title</EnvironmentVariablesTitle>);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });
});

describe("EnvironmentVariablesToggle", () => {
  it("toggles visibility", () => {
    render(
      <EnvironmentVariables>
        <EnvironmentVariablesHeader>
          <EnvironmentVariablesTitle />
          <EnvironmentVariablesToggle />
        </EnvironmentVariablesHeader>
        <EnvironmentVariablesContent>
          <EnvironmentVariable name="API_KEY" value="secret123">
            <EnvironmentVariableName />
            <EnvironmentVariableValue />
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>,
    );

    // Initially values are hidden (dots)
    expect(screen.getByText("•".repeat(9))).toBeInTheDocument();

    // Click toggle
    fireEvent.click(screen.getByRole("switch"));

    // Now value should be visible
    expect(screen.getByText("secret123")).toBeInTheDocument();
  });
});

describe("EnvironmentVariable", () => {
  it("renders children within parent context", () => {
    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="MY_VAR" value="my_value">
          <span>Variable content</span>
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );
    expect(screen.getByText("Variable content")).toBeInTheDocument();
  });

  it("renders default layout when no children", () => {
    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="MY_VAR" value="my_value" />
      </EnvironmentVariables>,
    );
    expect(screen.getByText("MY_VAR")).toBeInTheDocument();
  });
});

describe("EnvironmentVariableName", () => {
  it("renders name from context", () => {
    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="DB_HOST" value="localhost">
          <EnvironmentVariableName />
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );
    expect(screen.getByText("DB_HOST")).toBeInTheDocument();
  });
});

describe("EnvironmentVariableValue", () => {
  it("renders masked dots when hidden", () => {
    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="SECRET" value="abc123">
          <EnvironmentVariableValue />
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );
    expect(screen.getByText("•".repeat(6))).toBeInTheDocument();
  });

  it("renders actual value when showValues is true", () => {
    render(
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariable name="SECRET" value="abc123">
          <EnvironmentVariableValue />
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("masks to max 20 dots for long values", () => {
    const longValue = "a".repeat(30);
    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="LONG" value={longValue}>
          <EnvironmentVariableValue />
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );
    expect(screen.getByText("•".repeat(20))).toBeInTheDocument();
  });
});

describe("EnvironmentVariableCopyButton", () => {
  it("copies value to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="KEY" value="secret">
          <EnvironmentVariableCopyButton />
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("secret");
    });
  });

  it("copies in export format", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <EnvironmentVariables>
        <EnvironmentVariable name="KEY" value="secret">
          <EnvironmentVariableCopyButton copyFormat="export" />
        </EnvironmentVariable>
      </EnvironmentVariables>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('export KEY="secret"');
    });
  });
});

describe("EnvironmentVariableRequired", () => {
  it("renders default badge text", () => {
    render(<EnvironmentVariableRequired />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders custom badge text", () => {
    render(<EnvironmentVariableRequired>Optional</EnvironmentVariableRequired>);
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });
});
