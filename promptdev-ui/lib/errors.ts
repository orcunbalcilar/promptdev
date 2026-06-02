/**
 * Error classification and user feedback utilities.
 * PRD-10: Standardized error taxonomy.
 */
import { toast } from "sonner";

export type ErrorCategory =
  | "AUTH"
  | "VALIDATION"
  | "NETWORK"
  | "SERVER"
  | "UNKNOWN";

export interface AppError {
  category: ErrorCategory;
  message: string;
  details?: string;
  status?: number;
}

/**
 * Classify an error into a known category for differentiated UX.
 */
export function classifyError(error: unknown): AppError {
  // ApiError from lib/api.ts
  if (error instanceof Error && "status" in error) {
    const apiError = error as Error & { status: number; details?: string };
    if (apiError.status === 401 || apiError.status === 403) {
      return {
        category: "AUTH",
        message: "Your session has expired",
        status: apiError.status,
      };
    }
    if (apiError.status === 422 || apiError.status === 400) {
      return {
        category: "VALIDATION",
        message: apiError.message,
        details: apiError.details,
        status: apiError.status,
      };
    }
    if (apiError.status >= 500) {
      return {
        category: "SERVER",
        message: "Server error. Please try again later.",
        status: apiError.status,
      };
    }
  }
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      category: "NETWORK",
      message: "Network error. Check your connection.",
    };
  }
  return { category: "UNKNOWN", message: "Something went wrong." };
}

/**
 * Show an appropriate toast notification based on error classification.
 */
export function showErrorToast(error: unknown, context?: string) {
  const appError = classifyError(error);

  switch (appError.category) {
    case "AUTH":
      toast.error("Session expired. Please log in again.", {
        action: {
          label: "Log in",
          onClick: () => {
            globalThis.location.href = "/login";
          },
        },
      });
      break;
    case "VALIDATION":
      toast.error(appError.details ?? appError.message);
      break;
    case "NETWORK":
      toast.error("Connection lost. Please check your network.");
      break;
    case "SERVER":
      toast.error(
        context ? `Failed to ${context}. Server error.` : "Server error.",
      );
      break;
    default:
      toast.error(context ? `Failed to ${context}.` : "Something went wrong.");
  }
}
