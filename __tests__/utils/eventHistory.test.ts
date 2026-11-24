import {
  computeCareStats,
  daysSincePreviousSameType,
  formatDays,
  sortNewestFirst,
} from "../../utils/eventHistory";
import type { Event } from "../../types/Plant";

const ev = (id: string, event_type: Event["event_type"], date: string) =>
  ({ id, event_type, date, plant_id: "p1" }) as Event;

const buildEvents = () =>
  sortNewestFirst([
    ev("w1", "water", "2026-11-01T09:00:00Z"),
    ev("f1", "fertigate", "2026-11-05T09:00:00Z"),
    ev("w2", "water", "2026-11-08T09:00:00Z"),
    ev("w3", "water", "2026-11-15T09:00:00Z"),
    ev("l1", "new_leaf", "2026-11-16T09:00:00Z"),
  ]);

describe("eventHistory", () => {
  let events: Event[];
  beforeEach(() => {
    events = buildEvents();
  });

  it("sorts newest first", () => {
    expect(events.map((e) => e.id)).toEqual(["l1", "w3", "w2", "f1", "w1"]);
  });

  it("summarises care types only, most frequent first", () => {
    const stats = computeCareStats(events, new Set(["water", "fertigate"]));
    expect(stats.map((s) => s.type)).toEqual(["water", "fertigate"]);
    expect(stats[0]).toMatchObject({ count: 3, lastEventId: "w3", avgIntervalDays: 7 });
    expect(stats[1]).toMatchObject({ count: 1, lastEventId: "f1", avgIntervalDays: null });
  });

  it("computes days since the previous event of the same type", () => {
    const gaps = daysSincePreviousSameType(events);
    expect(gaps.get("w3")).toBe(7);
    expect(gaps.get("w2")).toBe(7);
    expect(gaps.has("w1")).toBe(false);
    expect(gaps.has("f1")).toBe(false);
  });

  it("formats durations compactly", () => {
    expect(formatDays(0)).toBe("same day");
    expect(formatDays(6.6)).toBe("7d");
    expect(formatDays(21)).toBe("3w");
    expect(formatDays(90)).toBe("3mo");
  });
});
