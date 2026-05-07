import { describe, it, expect, beforeEach } from "vitest";
import { getFavorites, toggleFavorite, isFavorite, clearFavorites } from "../favorites";

describe("favorites – coverage (branches on lines 8, 27-39)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty set when localStorage is empty (line 8: stored is null)", () => {
    expect(getFavorites().size).toBe(0);
  });

  it("returns empty set when localStorage has invalid JSON", () => {
    localStorage.setItem("promptdev-favorites", "not-json");
    expect(getFavorites().size).toBe(0);
  });

  it("toggleFavorite adds a favorite (line 27-39: add path)", () => {
    const result = toggleFavorite("task-1");
    expect(result).toBe(true);
    expect(isFavorite("task-1")).toBe(true);
  });

  it("toggleFavorite removes an existing favorite (line 27-39: remove path)", () => {
    toggleFavorite("task-1"); // add
    const result = toggleFavorite("task-1"); // remove
    expect(result).toBe(false);
    expect(isFavorite("task-1")).toBe(false);
  });

  it("clearFavorites removes all favorites", () => {
    toggleFavorite("task-1");
    toggleFavorite("task-2");
    clearFavorites();
    expect(getFavorites().size).toBe(0);
  });

  it("isFavorite returns false for unknown task", () => {
    expect(isFavorite("unknown")).toBe(false);
  });

  it("getFavorites returns set with saved favorites", () => {
    localStorage.setItem("promptdev-favorites", JSON.stringify(["a", "b"]));
    const favs = getFavorites();
    expect(favs.size).toBe(2);
    expect(favs.has("a")).toBe(true);
  });
});
