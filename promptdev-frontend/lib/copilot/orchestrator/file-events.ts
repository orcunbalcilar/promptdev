/**
 * File event detection helpers for the orchestrator event tracking.
 */

/** Tool names that indicate file write operations */
const FILE_WRITE_TOOLS = new Set([
  "write_file",
  "create_file",
  "edit_file",
  "replace_in_file",
  "insert_edit_into_file",
  "edit",
  "write",
  "replace",
  "insert_edit",
  "multi_edit",
  "MultiEditTool",
  "replace_string_in_file",
  "multi_replace_string_in_file",
]);

const FILE_DELETE_TOOLS = new Set(["delete_file", "remove_file", "delete"]);

export function inferFileEventType(toolName: string): string | null {
  const lower = toolName.toLowerCase();
  if (FILE_DELETE_TOOLS.has(lower) || FILE_DELETE_TOOLS.has(toolName))
    return "FILE_DELETED";
  if (lower === "create_file" || lower === "create") return "FILE_CREATED";
  if (FILE_WRITE_TOOLS.has(lower) || FILE_WRITE_TOOLS.has(toolName))
    return "FILE_MODIFIED";
  if (
    lower.includes("write") ||
    lower.includes("edit") ||
    lower.includes("replace") ||
    lower.includes("insert")
  ) {
    return "FILE_MODIFIED";
  }
  if (lower.includes("create_file") || lower.includes("new_file")) {
    return "FILE_CREATED";
  }
  return null;
}

export function extractFilePath(
  input: Record<string, unknown>,
): string | undefined {
  const pathKeys = [
    "path",
    "filePath",
    "file_path",
    "file",
    "filename",
    "target",
    "uri",
    "resource",
    "name",
  ];
  for (const key of pathKeys) {
    if (typeof input[key] === "string" && input[key]) {
      const val = String(input[key]);
      if (val.includes("/") || val.includes(".")) return val;
    }
  }
  if (typeof input.fileEdit === "object" && input.fileEdit !== null) {
    return extractFilePath(input.fileEdit as Record<string, unknown>);
  }
  return undefined;
}

export function getFileEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    FILE_DELETED: "Deleted",
    FILE_CREATED: "Created",
  };
  return labels[eventType] ?? "Modified";
}
