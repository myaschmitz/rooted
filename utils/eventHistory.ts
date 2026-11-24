import dayjs from "dayjs";
import type { Event } from "../types/Plant";
import type { CareEventType } from "../constants/careTypes";

export interface CareTypeStat {
  type: CareEventType;
  count: number;
  lastEventId: string;
  /** Average days between the most recent occurrences, or null if < 2. */
  avgIntervalDays: number | null;
}

const INTERVAL_SAMPLE = 6;

const dayDiff = (newer: string, older: string) =>
  dayjs(newer).startOf("day").diff(dayjs(older).startOf("day"), "day");

export const sortNewestFirst = (events: Event[]): Event[] =>
  [...events].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

/**
 * Per-type summary for the given care types (water, fertigate, …), most
 * frequent first. Expects events sorted newest first.
 */
export function computeCareStats(
  sortedDesc: Event[],
  careTypes: ReadonlySet<CareEventType>,
): CareTypeStat[] {
  const byType = new Map<CareEventType, Event[]>();
  for (const e of sortedDesc) {
    if (!careTypes.has(e.event_type)) continue;
    const list = byType.get(e.event_type);
    if (list) list.push(e);
    else byType.set(e.event_type, [e]);
  }

  const stats: CareTypeStat[] = [];
  byType.forEach((list, type) => {
    const sample = list.slice(0, INTERVAL_SAMPLE);
    let avg: number | null = null;
    if (sample.length >= 2) {
      const span = dayDiff(sample[0].date, sample[sample.length - 1].date);
      avg = span / (sample.length - 1);
    }
    stats.push({
      type,
      count: list.length,
      lastEventId: list[0].id,
      avgIntervalDays: avg,
    });
  });

  return stats.sort((a, b) => b.count - a.count);
}

/** Days since the previous event of the same type, keyed by event id. */
export function daysSincePreviousSameType(
  sortedDesc: Event[],
): Map<string, number> {
  const result = new Map<string, number>();
  const lastSeen = new Map<string, string>();
  for (let i = sortedDesc.length - 1; i >= 0; i--) {
    const e = sortedDesc[i];
    const prev = lastSeen.get(e.event_type);
    if (prev) result.set(e.id, dayDiff(e.date, prev));
    lastSeen.set(e.event_type, e.date);
  }
  return result;
}

/** Compact duration: "same day", "4d", "3w", "2mo". */
export function formatDays(days: number): string {
  const d = Math.round(days);
  if (d <= 0) return "same day";
  if (d < 14) return `${d}d`;
  if (d < 60) return `${Math.round(d / 7)}w`;
  return `${Math.round(d / 30)}mo`;
}
