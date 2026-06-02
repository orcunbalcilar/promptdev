import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { classifyError, showErrorToast } from "../errors";
import { toast } from "sonner";

class ApiError extends Error {
  status: number;
  details?: string;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset any location mocks
  Object.defineProperty(globalThis, "location", {
    value: { href: "" },
    writable: true,
    configurable: true,
  });
});

describe("classifyError – additional branches", () => {
  it("classifies TypeError without 'fetch' as UNKNOWN", () => {
    const error = new TypeError("Cannot read properties of undefined");
    const result = classifyError(error);
    expect(result.category).toBe("UNKNOWN");
  });

  it("classifies non-standard status codes (e.g. 404) as UNKNOWN", () => {
    // 404 doesn't match AUTH (401/403), VALIDATION (400/422), or SERVER (500+)
    const error = new ApiError("Not found", 404);
    const result = classifyError(error);
    expect(result.category).toBe("UNKNOWN");
  });

  it("classifies 503 as SERVER", () => {
    const result = classifyError(new ApiError("Service unavailable", 503));
    expect(result.category).toBe("SERVER");
    expect(result.status).toBe(503);
  });

  it("preserves message and details for VALIDATION errors", () => {
    const result = classifyError(
      new ApiError("Invalid field", 422, "Name is required"),
    );
    expect(result.category).toBe("VALIDATION");
    expect(result.message).toBe("Invalid field");
    expect(result.details).toBe("Name is required");
  });

  it("classifies undefined as UNKNOWN", () => {
    const result = classifyError(undefined);
    expect(result.category).toBe("UNKNOWN");
    expect(result.message).toBe("Something went wrong.");
  });

  it("classifies a plain object (non-Error) as UNKNOWN", () => {
    const result = classifyError({ code: 500 });
    expect(result.category).toBe("UNKNOWN");
  });
});

describe("showErrorToast", () => {
  describe("AUTH category", () => {
    it("shows session expired toast with login action", () => {
      const error = new ApiError("Unauthorized", 401);
      showErrorToast(error);

      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please log in again.",
        expect.objectContaining({
          action: expect.objectContaining({
            label: "Log in",
            onClick: expect.any(Function),
          }),
        }),
      );
    });

    it("login action redirects to /login", () => {
      const error = new ApiError("Unauthorized", 401);
      showErrorToast(error);

      const call = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0];
      const action = call[1].action;
      action.onClick();
      expect(globalThis.location.href).toBe("/login");
    });

    it("shows same toast for 403 errors", () => {
      showErrorToast(new ApiError("Forbidden", 403));
      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please log in again.",
        expect.any(Object),
      );
    });
  });

  describe("VALIDATION category", () => {
    it("shows details when available", () => {
      const error = new ApiError("Bad request", 400, "Title is required");
      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith("Title is required");
    });

    it("falls back to message when no details", () => {
      const error = new ApiError("Invalid input", 422);
      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith("Invalid input");
    });
  });

  describe("NETWORK category", () => {
    it("shows connection lost toast", () => {
      const error = new TypeError("fetch failed");
      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith(
        "Connection lost. Please check your network.",
      );
    });

    it("ignores context for network errors", () => {
      const error = new TypeError("fetch failed");
      showErrorToast(error, "save task");
      expect(toast.error).toHaveBeenCalledWith(
        "Connection lost. Please check your network.",
      );
    });
  });

  describe("SERVER category", () => {
    it("shows generic server error without context", () => {
      const error = new ApiError("Internal", 500);
      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith("Server error.");
    });

    it("shows contextual server error message", () => {
      const error = new ApiError("Internal", 500);
      showErrorToast(error, "save task");
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to save task. Server error.",
      );
    });

    it("handles 502 as server error", () => {
      showErrorToast(new ApiError("Bad gateway", 502));
      expect(toast.error).toHaveBeenCalledWith("Server error.");
    });
  });

  describe("UNKNOWN category (default branch)", () => {
    it("shows generic error without context", () => {
      const error = new Error("something random");
      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith("Something went wrong.");
    });

    it("shows contextual error message", () => {
      const error = new Error("something random");
      showErrorToast(error, "load data");
      expect(toast.error).toHaveBeenCalledWith("Failed to load data.");
    });

    it("handles null error", () => {
      showErrorToast(null);
      expect(toast.error).toHaveBeenCalledWith("Something went wrong.");
    });

    it("handles string error", () => {
      showErrorToast("string error", "perform action");
      expect(toast.error).toHaveBeenCalledWith("Failed to perform action.");
    });
  });
});
