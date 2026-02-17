import type { SessionState } from "@/lib/copilot/types";

/** Copilot slash commands (used by command help display) */
export const COPILOT_COMMANDS = [
  {
    name: "/model",
    description: "Switch AI model",
    usage: "/model <model-id>",
  },
  {
    name: "/review",
    description: "Review code in a repository",
    usage: "/review <repo> [branch]",
  },
  { name: "/fleet", description: "Show agent fleet status", usage: "/fleet" },
  {
    name: "/clear",
    description: "Clear conversation history",
    usage: "/clear",
  },
  { name: "/help", description: "Show available commands", usage: "/help" },
];

/** Reasoning effort levels */
export const REASONING_EFFORTS = [
  { id: "low", name: "Low", description: "Fast responses" },
  { id: "medium", name: "Medium", description: "Balanced" },
  { id: "high", name: "High", description: "Detailed reasoning" },
  { id: "xhigh", name: "Extra High", description: "Maximum depth" },
];

/** Session state indicator colors */
export const stateColors: Record<SessionState, string> = {
  idle: "bg-green-500",
  processing: "bg-blue-500 animate-pulse",
  streaming: "bg-blue-500 animate-pulse",
  error: "bg-red-500",
  disconnected: "bg-gray-500",
};
