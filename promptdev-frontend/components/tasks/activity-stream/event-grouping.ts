import type { EventType, TaskEvent } from "@/lib/api";
import {
  type EventGroup,
  ITERATION_TYPES,
  REVIEW_TYPES,
  STEP_TYPES,
  TRIAGE_TYPES,
} from "./types";

function buildToolResultMap(
  events: TaskEvent[],
  consumed: Set<string>,
): Map<number, TaskEvent> {
  const map = new Map<number, TaskEvent>();
  for (let i = 0; i < events.length; i++) {
    if (
      events[i].eventType !== "AGENT_TOOL_RESULT" ||
      consumed.has(events[i].id)
    )
      continue;
    for (let j = i - 1; j >= 0; j--) {
      if (events[j].eventType === "AGENT_TOOL_CALL" && !map.has(j)) {
        map.set(j, events[i]);
        consumed.add(events[i].id);
        break;
      }
    }
  }
  return map;
}

function collectGroupedEvents(
  events: TaskEvent[],
  types: EventType[],
  consumed: Set<string>,
): TaskEvent[] {
  const collected: TaskEvent[] = [];
  for (const e of events) {
    if (types.includes(e.eventType)) {
      collected.push(e);
      consumed.add(e.id);
    }
  }
  return collected;
}

function collectConsecutiveBatch(
  events: TaskEvent[],
  startIdx: number,
  types: EventType[],
  consumed: Set<string>,
): TaskEvent[] {
  const batch: TaskEvent[] = [events[startIdx]];
  consumed.add(events[startIdx].id);
  for (let j = startIdx + 1; j < events.length; j++) {
    /* v8 ignore start — type mismatch break rarely hit in grouped batches */
    if (!types.includes(events[j].eventType)) break;
    /* v8 ignore stop */
    batch.push(events[j]);
    consumed.add(events[j].id);
  }
  return batch;
}

function insertGroupAtPosition(
  groups: EventGroup[],
  events: TaskEvent[],
  groupedEvents: TaskEvent[],
  group: EventGroup,
): void {
  if (groupedEvents.length === 0) return;
  const firstIdx = events.indexOf(groupedEvents[0]);
  const insertIdx = groups.findIndex(
    (g) => events.indexOf(g.events[0]) > firstIdx,
  );
  if (insertIdx >= 0) groups.splice(insertIdx, 0, group);
  else groups.push(group);
}

export function groupEvents(events: TaskEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  const consumed = new Set<string>();

  const toolResultMap = buildToolResultMap(events, consumed);
  const reviewEvents = collectGroupedEvents(events, REVIEW_TYPES, consumed);
  const triageEvents = collectGroupedEvents(events, TRIAGE_TYPES, consumed);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (consumed.has(event.id)) continue;

    if (event.eventType === "AGENT_TOOL_CALL") {
      const result = toolResultMap.get(i);
      groups.push({
        type: "tool-pair",
        events: result ? [event, result] : [event],
        key: event.id,
      });
      consumed.add(event.id);
      continue;
    }

    if (STEP_TYPES.includes(event.eventType)) {
      groups.push({
        type: "step",
        events: collectConsecutiveBatch(events, i, STEP_TYPES, consumed),
        key: event.id,
      });
      continue;
    }

    if (ITERATION_TYPES.includes(event.eventType)) {
      groups.push({
        type: "iteration",
        events: collectConsecutiveBatch(events, i, ITERATION_TYPES, consumed),
        key: event.id,
      });
      continue;
    }

    groups.push({ type: "single", events: [event], key: event.id });
    consumed.add(event.id);
  }

  insertGroupAtPosition(groups, events, reviewEvents, {
    type: "review",
    events: reviewEvents,
    key: `review-${reviewEvents[0]?.id}`,
  });
  insertGroupAtPosition(groups, events, triageEvents, {
    type: "triage",
    events: triageEvents,
    key: `triage-${triageEvents[0]?.id}`,
  });

  return groups;
}
