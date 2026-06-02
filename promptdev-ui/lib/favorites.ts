/**
 * Client-side task pinning and favorites management using localStorage.
 */

const STORAGE_KEY = "promptdev-favorites";

export function getFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function toggleFavorite(taskId: string): boolean {
  const favorites = getFavorites();
  const isFavorite = favorites.has(taskId);
  
  if (isFavorite) {
    favorites.delete(taskId);
  } else {
    favorites.add(taskId);
  }
  
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  }
  
  return !isFavorite;
}

export function isFavorite(taskId: string): boolean {
  return getFavorites().has(taskId);
}

export function clearFavorites(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
