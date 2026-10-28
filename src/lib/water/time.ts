import { DISPLAY_TIME_ZONE } from "./config";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function zonedParts(d: Date): ZonedParts {
  const p = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
  for (const part of partsFmt.formatToParts(d)) {
    if (part.type in p) p[part.type as keyof typeof p] = Number(part.value);
  }
  return { ...p, hour: p.hour % 24 };
}

/** Offset (ms) of Europe/Oslo from UTC at the given instant. Handles DST. */
function zoneOffsetMs(d: Date): number {
  const z = zonedParts(d);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, d.getUTCSeconds());
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** UTC instant for Oslo wall-clock midnight of the given Oslo date. */
export function osloMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  let t = guess - zoneOffsetMs(new Date(guess));
  t = guess - zoneOffsetMs(new Date(t));
  return new Date(t);
}

export function startOfOsloDay(d: Date): Date {
  const z = zonedParts(d);
  return osloMidnight(z.year, z.month, z.day);
}

export function addOsloDays(dayStart: Date, n: number): Date {
  const z = zonedParts(new Date(dayStart.getTime() + 12 * 3600_000));
  const ref = new Date(Date.UTC(z.year, z.month - 1, z.day + n));
  return osloMidnight(ref.getUTCFullYear(), ref.getUTCMonth() + 1, ref.getUTCDate());
}

/** Oslo offsets are whole hours, so UTC hour boundaries are Oslo hour boundaries. */
export function startOfHour(d: Date): Date {
  const t = new Date(d);
  t.setUTCMinutes(0, 0, 0);
  return t;
}
