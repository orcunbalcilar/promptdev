/**
 * Real-time collaboration presence tracking types and utilities.
 */

export interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  taskId: string;
  lastSeenAt: string;
  status: "viewing" | "editing";
}

export interface PresenceState {
  viewers: Map<string, UserPresence>;
}

export function createPresenceState(): PresenceState {
  return { viewers: new Map() };
}

export function addViewer(state: PresenceState, presence: UserPresence): PresenceState {
  const viewers = new Map(state.viewers);
  viewers.set(presence.userId, presence);
  return { viewers };
}

export function removeViewer(state: PresenceState, userId: string): PresenceState {
  const viewers = new Map(state.viewers);
  viewers.delete(userId);
  return { viewers };
}

export function getActiveViewers(state: PresenceState, maxAgeMs = 30_000): UserPresence[] {
  const now = Date.now();
  return [...state.viewers.values()].filter(
    (v) => now - new Date(v.lastSeenAt).getTime() < maxAgeMs
  );
}

export function isUserViewing(state: PresenceState, userId: string): boolean {
  return state.viewers.has(userId);
}
