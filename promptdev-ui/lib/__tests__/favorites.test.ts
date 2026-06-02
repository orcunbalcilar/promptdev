import { getFavorites, toggleFavorite, isFavorite, clearFavorites } from "@/lib/favorites";

describe("favorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getFavorites", () => {
    it("should return empty set when no favorites exist", () => {
      const favorites = getFavorites();
      expect(favorites.size).toBe(0);
    });

    it("should return stored favorites", () => {
      localStorage.setItem("promptdev-favorites", JSON.stringify(["task-1", "task-2"]));
      const favorites = getFavorites();
      expect(favorites.size).toBe(2);
      expect(favorites.has("task-1")).toBe(true);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("promptdev-favorites", "not-json!!!");
      const favorites = getFavorites();
      expect(favorites.size).toBe(0);
    });
  });

  describe("toggleFavorite", () => {
    it("should add a task to favorites", () => {
      const result = toggleFavorite("task-1");
      expect(result).toBe(true);
      expect(isFavorite("task-1")).toBe(true);
    });

    it("should remove a task from favorites", () => {
      toggleFavorite("task-1"); // add
      const result = toggleFavorite("task-1"); // remove
      expect(result).toBe(false);
      expect(isFavorite("task-1")).toBe(false);
    });

    it("should persist across calls", () => {
      toggleFavorite("task-1");
      toggleFavorite("task-2");
      const favorites = getFavorites();
      expect(favorites.size).toBe(2);
    });
  });

  describe("isFavorite", () => {
    it("should return false for non-favorited tasks", () => {
      expect(isFavorite("nonexistent")).toBe(false);
    });

    it("should return true for favorited tasks", () => {
      toggleFavorite("task-1");
      expect(isFavorite("task-1")).toBe(true);
    });
  });

  describe("clearFavorites", () => {
    it("should remove all favorites", () => {
      toggleFavorite("task-1");
      toggleFavorite("task-2");
      clearFavorites();
      expect(getFavorites().size).toBe(0);
    });
  });

  // ── Branch coverage: SSR (typeof window === 'undefined') ──────

  describe("branch coverage – server-side (no window)", () => {
    const realWindow = globalThis.window;

    afterEach(() => {
      // Restore window
      Object.defineProperty(globalThis, "window", {
        value: realWindow,
        configurable: true,
        writable: true,
      });
    });

    it("getFavorites returns empty set when window is undefined", () => {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      const result = getFavorites();
      expect(result.size).toBe(0);
    });

    it("toggleFavorite works when window is undefined (no-op write)", () => {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      // Should not throw
      const result = toggleFavorite("task-1");
      expect(result).toBe(true);
    });

    it("clearFavorites works when window is undefined (no-op)", () => {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      expect(() => clearFavorites()).not.toThrow();
    });
  });
});
