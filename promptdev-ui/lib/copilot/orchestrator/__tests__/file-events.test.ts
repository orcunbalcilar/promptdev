import { describe, it, expect } from "vitest";
import {
  inferFileEventType,
  extractFilePath,
  getFileEventLabel,
} from "../file-events";

describe("file-events", () => {
  // ── inferFileEventType ──────────────────────────────────────────

  describe("inferFileEventType", () => {
    it.each([
      ["delete_file", "FILE_DELETED"],
      ["remove_file", "FILE_DELETED"],
      ["delete", "FILE_DELETED"],
    ])('should return FILE_DELETED for "%s"', (tool, expected) => {
      expect(inferFileEventType(tool)).toBe(expected);
    });

    it.each([
      ["create_file", "FILE_CREATED"],
      ["create", "FILE_CREATED"],
    ])('should return FILE_CREATED for "%s"', (tool, expected) => {
      expect(inferFileEventType(tool)).toBe(expected);
    });

    it.each([
      ["write_file", "FILE_MODIFIED"],
      ["edit_file", "FILE_MODIFIED"],
      ["replace_in_file", "FILE_MODIFIED"],
      ["insert_edit_into_file", "FILE_MODIFIED"],
      ["edit", "FILE_MODIFIED"],
      ["write", "FILE_MODIFIED"],
      ["replace", "FILE_MODIFIED"],
      ["insert_edit", "FILE_MODIFIED"],
      ["multi_edit", "FILE_MODIFIED"],
      ["replace_string_in_file", "FILE_MODIFIED"],
      ["multi_replace_string_in_file", "FILE_MODIFIED"],
    ])('should return FILE_MODIFIED for "%s"', (tool, expected) => {
      expect(inferFileEventType(tool)).toBe(expected);
    });

    it("should match case-insensitive tool names from the Set", () => {
      expect(inferFileEventType("MultiEditTool")).toBe("FILE_MODIFIED");
    });

    it('should return FILE_MODIFIED for names containing "write"', () => {
      expect(inferFileEventType("custom_write_tool")).toBe("FILE_MODIFIED");
    });

    it('should return FILE_MODIFIED for names containing "edit"', () => {
      expect(inferFileEventType("my_edit_helper")).toBe("FILE_MODIFIED");
    });

    it('should return FILE_MODIFIED for names containing "replace"', () => {
      expect(inferFileEventType("bulk_replace")).toBe("FILE_MODIFIED");
    });

    it('should return FILE_MODIFIED for names containing "insert"', () => {
      expect(inferFileEventType("batch_insert")).toBe("FILE_MODIFIED");
    });

    it('should return FILE_CREATED for names containing "create_file"', () => {
      expect(inferFileEventType("my_create_file_helper")).toBe("FILE_CREATED");
    });

    it('should return FILE_CREATED for names containing "new_file"', () => {
      expect(inferFileEventType("open_new_file")).toBe("FILE_CREATED");
    });

    it("should return null for unrecognized tool names", () => {
      expect(inferFileEventType("read_file")).toBeNull();
      expect(inferFileEventType("list_directory")).toBeNull();
      expect(inferFileEventType("run_command")).toBeNull();
    });

    it("should prioritize FILE_DELETED over other matches", () => {
      // "delete_file" is in both FILE_DELETE_TOOLS and has "file" in name
      expect(inferFileEventType("delete_file")).toBe("FILE_DELETED");
    });

    it("should handle empty string", () => {
      expect(inferFileEventType("")).toBeNull();
    });
  });

  // ── extractFilePath ─────────────────────────────────────────────

  describe("extractFilePath", () => {
    it('should extract from "path" key', () => {
      expect(extractFilePath({ path: "src/index.ts" })).toBe("src/index.ts");
    });

    it('should extract from "filePath" key', () => {
      expect(extractFilePath({ filePath: "lib/utils.ts" })).toBe(
        "lib/utils.ts",
      );
    });

    it('should extract from "file_path" key', () => {
      expect(extractFilePath({ file_path: "app/page.tsx" })).toBe(
        "app/page.tsx",
      );
    });

    it('should extract from "file" key', () => {
      expect(extractFilePath({ file: "README.md" })).toBe("README.md");
    });

    it('should extract from "filename" key', () => {
      expect(extractFilePath({ filename: "config.json" })).toBe("config.json");
    });

    it('should extract from "target" key', () => {
      expect(extractFilePath({ target: "/tmp/output.txt" })).toBe(
        "/tmp/output.txt",
      );
    });

    it('should extract from "uri" key', () => {
      expect(extractFilePath({ uri: "file:///src/main.ts" })).toBe(
        "file:///src/main.ts",
      );
    });

    it('should extract from "resource" key', () => {
      expect(extractFilePath({ resource: "assets/logo.png" })).toBe(
        "assets/logo.png",
      );
    });

    it('should extract from "name" key when it looks like a path', () => {
      expect(extractFilePath({ name: "src/component.tsx" })).toBe(
        "src/component.tsx",
      );
    });

    it("should prioritize keys in order (path before filePath)", () => {
      expect(
        extractFilePath({ path: "first.ts", filePath: "second.ts" }),
      ).toBe("first.ts");
    });

    it("should skip string values that don't look like file paths", () => {
      // "name" key with no / or . => not a file path
      expect(extractFilePath({ name: "myFunction" })).toBeUndefined();
    });

    it("should recurse into fileEdit object", () => {
      expect(
        extractFilePath({
          fileEdit: { path: "nested/file.ts" },
        }),
      ).toBe("nested/file.ts");
    });

    it("should return undefined when no path found", () => {
      expect(extractFilePath({})).toBeUndefined();
      expect(extractFilePath({ randomKey: "value" })).toBeUndefined();
    });

    it("should return undefined for non-string values", () => {
      expect(extractFilePath({ path: 123 })).toBeUndefined();
      expect(extractFilePath({ filePath: null })).toBeUndefined();
    });

    it("should skip empty string values", () => {
      expect(extractFilePath({ path: "" })).toBeUndefined();
    });

    it("should handle fileEdit being null", () => {
      expect(extractFilePath({ fileEdit: null })).toBeUndefined();
    });
  });

  // ── getFileEventLabel ───────────────────────────────────────────

  describe("getFileEventLabel", () => {
    it('should return "Deleted" for FILE_DELETED', () => {
      expect(getFileEventLabel("FILE_DELETED")).toBe("Deleted");
    });

    it('should return "Created" for FILE_CREATED', () => {
      expect(getFileEventLabel("FILE_CREATED")).toBe("Created");
    });

    it('should return "Modified" for FILE_MODIFIED', () => {
      expect(getFileEventLabel("FILE_MODIFIED")).toBe("Modified");
    });

    it('should return "Modified" for unknown event types', () => {
      expect(getFileEventLabel("UNKNOWN_EVENT")).toBe("Modified");
      expect(getFileEventLabel("")).toBe("Modified");
    });
  });
});
