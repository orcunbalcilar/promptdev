import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import {
  TestResults,
  TestResultsContent,
  TestError,
  TestErrorMessage,
  TestErrorStack,
} from "@/components/ai-elements/test-results";

describe("TestErrorStack (line 488)", () => {
  it("renders error stack trace within test results", () => {
    render(
      <TestResults>
        <TestResultsContent>
          <TestError>
            <TestErrorMessage>Assertion failed</TestErrorMessage>
            <TestErrorStack>
              Error: expected true to be false{"\n"} at Object.test
              (test.ts:10:5)
            </TestErrorStack>
          </TestError>
        </TestResultsContent>
      </TestResults>,
    );

    expect(screen.getByText(/Assertion failed/)).toBeTruthy();
    expect(screen.getByText(/expected true to be false/)).toBeTruthy();
  });

  it("renders TestErrorStack with custom className", () => {
    const { container } = render(
      <TestErrorStack className="custom-stack">
        Stack trace here
      </TestErrorStack>,
    );

    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre?.className).toContain("custom-stack");
    expect(pre?.textContent).toBe("Stack trace here");
  });

  it("renders TestErrorMessage with custom className", () => {
    const { container } = render(
      <TestErrorMessage className="custom-msg">Error msg</TestErrorMessage>,
    );

    const p = container.querySelector("p");
    expect(p).toBeTruthy();
    expect(p?.className).toContain("custom-msg");
  });
});
