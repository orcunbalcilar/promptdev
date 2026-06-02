import {
  createPresenceState,
  addViewer,
  removeViewer,
  getActiveViewers,
  isUserViewing,
} from "@/lib/presence";
import type { UserPresence } from "@/lib/presence";

const makePresence = (overrides: Partial<UserPresence> = {}): UserPresence => ({
  userId: "user-1",
  userName: "Alice",
  taskId: "task-1",
  lastSeenAt: new Date().toISOString(),
  status: "viewing",
  ...overrides,
});

describe("presence", () => {
  describe("createPresenceState", () => {
    it("should create empty presence state", () => {
      const state = createPresenceState();
      expect(state.viewers.size).toBe(0);
    });
  });

  describe("addViewer", () => {
    it("should add a viewer to state", () => {
      let state = createPresenceState();
      state = addViewer(state, makePresence());
      expect(state.viewers.size).toBe(1);
    });

    it("should update existing viewer", () => {
      let state = createPresenceState();
      state = addViewer(state, makePresence({ status: "viewing" }));
      state = addViewer(state, makePresence({ status: "editing" }));
      expect(state.viewers.size).toBe(1);
      expect(state.viewers.get("user-1")!.status).toBe("editing");
    });

    it("should not mutate original state", () => {
      const state1 = createPresenceState();
      const state2 = addViewer(state1, makePresence());
      expect(state1.viewers.size).toBe(0);
      expect(state2.viewers.size).toBe(1);
    });
  });

  describe("removeViewer", () => {
    it("should remove a viewer from state", () => {
      let state = createPresenceState();
      state = addViewer(state, makePresence());
      state = removeViewer(state, "user-1");
      expect(state.viewers.size).toBe(0);
    });

    it("should handle removing non-existent viewer", () => {
      const state = createPresenceState();
      const newState = removeViewer(state, "nonexistent");
      expect(newState.viewers.size).toBe(0);
    });
  });

  describe("getActiveViewers", () => {
    it("should return recently active viewers", () => {
      let state = createPresenceState();
      state = addViewer(state, makePresence({ userId: "user-1" }));
      state = addViewer(state, makePresence({ userId: "user-2" }));
      const active = getActiveViewers(state);
      expect(active).toHaveLength(2);
    });

    it("should filter out stale viewers", () => {
      let state = createPresenceState();
      const staleTime = new Date(Date.now() - 60000).toISOString();
      state = addViewer(
        state,
        makePresence({ userId: "user-1", lastSeenAt: staleTime }),
      );
      state = addViewer(state, makePresence({ userId: "user-2" }));
      const active = getActiveViewers(state);
      expect(active).toHaveLength(1);
      expect(active[0].userId).toBe("user-2");
    });
  });

  describe("isUserViewing", () => {
    it("should return true for existing viewer", () => {
      let state = createPresenceState();
      state = addViewer(state, makePresence());
      expect(isUserViewing(state, "user-1")).toBe(true);
    });

    it("should return false for non-existing viewer", () => {
      const state = createPresenceState();
      expect(isUserViewing(state, "user-1")).toBe(false);
    });
  });
});
