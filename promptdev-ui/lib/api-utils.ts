/**
 * Shared API utility functions for consistent error handling and response parsing.
 */
import { ApiError } from "@/lib/api";

/**
 * Formats an API error into a user-friendly message.
 */
export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Resource not found.";
    if (error.status === 401) return "Authentication required. Please sign in.";
    if (error.status === 403) return "You don't have permission for this action.";
    if (error.status === 429) return "Too many requests. Please try again later.";
    if (error.status >= 500) return "Server error. Please try again later.";
    return error.details ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

/**
 * Type guard for ApiError instances.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Determines if an error is retryable (server-side or network error).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 429;
  }
  return error instanceof TypeError; // Network errors
}
