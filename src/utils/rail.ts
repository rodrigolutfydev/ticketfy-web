import type { EventSummary } from "../api/types";

export const UPCOMING_RAIL_LIMIT = 8;

export function upcomingForRail(events: EventSummary[], now = Date.now(), limit = UPCOMING_RAIL_LIMIT) {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const startsAt = new Date(event.startsAt).getTime();
      if (!Number.isFinite(startsAt) || startsAt < now || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}

export const wrapIndex = (index: number, count: number) => ((index % count) + count) % count;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface RailLook {
  highlight: number;
  near: number;
  far: number;
}

export function railCardLook(distance: number, { highlight, near, far }: RailLook) {
  const d = Math.abs(distance);
  if (d > 3.5) return { scale: 1, opacity: 0 };
  const grow = smooth(clamp(1 - d, 0, 1));
  const opacity = d <= 1 ? lerp(near, 1, grow) : lerp(near, far, smooth(clamp(d - 1, 0, 1)));
  return { scale: Math.round((1 + highlight * grow) * 10000) / 10000, opacity: Math.round(opacity * 1000) / 1000 };
}

export function dotTarget(current: number, dot: number, count: number) {
  let delta = dot - wrapIndex(current, count);
  if (delta > count / 2) delta -= count;
  if (delta < -count / 2) delta += count;
  return current + delta;
}

export function stepTarget(position: number, target: number, direction: number) {
  const base = Math.round(position);
  return clamp(Math.round(target) + direction, base - 1, base + 1);
}

export function recenter(position: number, count: number) {
  if (position < count) return count;
  if (position >= 2 * count) return -count;
  return 0;
}

export function releaseDirection(moved: number, velocity: number) {
  if (moved > 0.18 || velocity < -0.45) return 1;
  if (moved < -0.18 || velocity > 0.45) return -1;
  return 0;
}

export function dragPosition(from: number, base: number, deltaX: number, step: number) {
  let position = from - deltaX / step;
  const low = base - 1;
  const high = base + 1;
  if (position < low) position = low - (1 - Math.exp(-(low - position))) * 0.25;
  if (position > high) position = high + (1 - Math.exp(-(position - high))) * 0.25;
  return position;
}
