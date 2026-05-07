import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
} from "@/components/ai-elements/confirmation";

describe("Confirmation useConfirmation error (line 52)", () => {
  it("throws when ConfirmationRequest is used outside Confirmation context", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<ConfirmationRequest>Approve?</ConfirmationRequest>);
    }).toThrow("Confirmation components must be used within Confirmation");

    consoleSpy.mockRestore();
  });

  it("renders null when approval is undefined", () => {
    const { container } = render(
      <Confirmation state="approval-requested" approval={undefined}>
        <ConfirmationTitle>Title</ConfirmationTitle>
      </Confirmation>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders null when state is input-streaming", () => {
    const { container } = render(
      <Confirmation
        state="input-streaming"
        approval={{ id: "1", approved: true }}
      >
        <ConfirmationTitle>Title</ConfirmationTitle>
      </Confirmation>
    );
    expect(container.innerHTML).toBe("");
  });
});
