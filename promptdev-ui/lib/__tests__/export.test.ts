import { tasksToCSV, tasksToJSON, exportTasks } from "@/lib/export";
import type { Task } from "@/lib/api";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test Task",
  prompt: "Do something",
  repositorySlug: "my-repo",
  workspaceType: "LOCAL",
  sourceBranch: "feature/test",
  targetBranch: "main",
  status: "COMPLETED",
  currentAttempt: 1,
  maxAttempts: 3,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T11:00:00Z",
  completedAt: "2024-01-15T11:00:00Z",
  ...overrides,
});

describe("export", () => {
  describe("tasksToCSV", () => {
    it("should generate CSV with default fields", () => {
      const tasks = [makeTask()];
      const csv = tasksToCSV(tasks);
      const lines = csv.split("\n");
      expect(lines[0]).toBe(
        "id,title,status,repositorySlug,workspaceType,sourceBranch,targetBranch,modelId,createdAt,updatedAt,completedAt",
      );
      expect(lines[1]).toContain("task-1");
      expect(lines[1]).toContain("Test Task");
    });

    it("should generate CSV with custom fields", () => {
      const tasks = [makeTask()];
      const csv = tasksToCSV(tasks, ["id", "title"]);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("id,title");
      expect(lines[1]).toBe("task-1,Test Task");
    });

    it("should escape values containing commas", () => {
      const tasks = [makeTask({ title: "Fix bug, refactor code" })];
      const csv = tasksToCSV(tasks, ["title"]);
      expect(csv).toContain('"Fix bug, refactor code"');
    });

    it("should escape values containing quotes", () => {
      const tasks = [makeTask({ title: 'Use "quotes" here' })];
      const csv = tasksToCSV(tasks, ["title"]);
      expect(csv).toContain('"Use ""quotes"" here"');
    });

    it("should handle multiple tasks", () => {
      const tasks = [
        makeTask({ id: "t1", title: "Task 1" }),
        makeTask({ id: "t2", title: "Task 2" }),
      ];
      const csv = tasksToCSV(tasks, ["id", "title"]);
      const lines = csv.split("\n");
      expect(lines).toHaveLength(3); // header + 2 rows
    });
  });

  describe("tasksToJSON", () => {
    it("should return valid JSON for all task fields", () => {
      const tasks = [makeTask()];
      const json = tasksToJSON(tasks);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("task-1");
    });

    it("should filter fields when specified", () => {
      const tasks = [makeTask()];
      const json = tasksToJSON(tasks, ["id", "title"]);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed[0])).toEqual(["id", "title"]);
    });

    it("should handle empty task array", () => {
      const json = tasksToJSON([]);
      expect(JSON.parse(json)).toEqual([]);
    });
  });

  describe("exportTasks", () => {
    it("should create and click a download link for CSV", () => {
      const clickSpy = vi.fn();
      vi.spyOn(document, "createElement").mockReturnValue({
        set href(v: string) {},
        set download(v: string) {},
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      exportTasks([makeTask()], { format: "csv" });
      expect(clickSpy).toHaveBeenCalled();
    });

    it("should use custom filename", () => {
      let downloadName = "";
      vi.spyOn(document, "createElement").mockReturnValue({
        set href(_: string) {},
        set download(v: string) {
          downloadName = v;
        },
        click: vi.fn(),
      } as unknown as HTMLAnchorElement);
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      exportTasks([makeTask()], { format: "json", filename: "my-report" });
      expect(downloadName).toBe("my-report.json");
    });
  });
});
