import { describe, it, expect, vi } from "vitest";
import { broadcastTaskUpdate, sendTaskEvent, subscribe } from "../sse-service";

describe("sse-service", () => {
  describe("broadcastTaskUpdate", () => {
    it("should send task-update events to global subscribers", () => {
      const callback = vi.fn();
      const unsub = subscribe(callback);

      broadcastTaskUpdate({ id: "task-1", status: "COMPLETED" });

      expect(callback).toHaveBeenCalledWith("task-update", {
        id: "task-1",
        status: "COMPLETED",
      });
      unsub();
    });

    it("should send task-update events to task-specific subscribers", () => {
      const callback = vi.fn();
      const unsub = subscribe(callback, "task-1");

      broadcastTaskUpdate({ id: "task-1", status: "COMPLETED" });

      expect(callback).toHaveBeenCalledWith("task-update", {
        id: "task-1",
        status: "COMPLETED",
      });
      unsub();
    });
  });

  describe("sendTaskEvent", () => {
    it("should send task-event to matching task subscriber", () => {
      const callback = vi.fn();
      const unsub = subscribe(callback, "task-1");

      sendTaskEvent("task-1", { eventType: "PROGRESS", message: "Working..." });

      expect(callback).toHaveBeenCalledWith("task-event", {
        eventType: "PROGRESS",
        message: "Working...",
      });
      unsub();
    });

    it("should NOT send task-event to subscriber of different task", () => {
      const callback = vi.fn();
      const unsub = subscribe(callback, "task-2");

      sendTaskEvent("task-1", { eventType: "PROGRESS" });

      expect(callback).not.toHaveBeenCalled();
      unsub();
    });

    it("should send task-event to global subscribers", () => {
      const callback = vi.fn();
      const unsub = subscribe(callback);

      sendTaskEvent("task-1", { eventType: "PROGRESS" });

      expect(callback).toHaveBeenCalledWith("task-event", { eventType: "PROGRESS" });
      unsub();
    });
  });

  describe("subscribe / unsubscribe", () => {
    it("should stop receiving events after unsubscribe", () => {
      const callback = vi.fn();
      const unsub = subscribe(callback);

      broadcastTaskUpdate({ id: "1" });
      expect(callback).toHaveBeenCalledTimes(1);

      unsub();

      broadcastTaskUpdate({ id: "2" });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should support multiple concurrent subscribers", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const unsub1 = subscribe(cb1);
      const unsub2 = subscribe(cb2);

      broadcastTaskUpdate({ id: "1" });

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });

    it("should isolate task-specific subscriptions", () => {
      const taskCb = vi.fn();
      const globalCb = vi.fn();
      const unsub1 = subscribe(taskCb, "task-1");
      const unsub2 = subscribe(globalCb);

      sendTaskEvent("task-1", { msg: "A" });
      sendTaskEvent("task-2", { msg: "B" });

      // task-specific: receives task-1 event only
      expect(taskCb).toHaveBeenCalledTimes(1);
      expect(taskCb).toHaveBeenCalledWith("task-event", { msg: "A" });

      // global: receives both
      expect(globalCb).toHaveBeenCalledTimes(2);

      unsub1();
      unsub2();
    });
  });
});
