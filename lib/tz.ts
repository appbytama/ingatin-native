// Ported verbatim from the Ingatin PWA (src/lib/tz.ts) — see that file for
// the full rationale. Indonesia (WIB) never observes DST, so a fixed +7h
// offset from UTC is always correct, no IANA tz database needed, and this
// sidesteps whatever timezone the device itself is set to.
//
// The pattern: convert a real UTC instant into a "fields" Date whose *UTC*
// getters/setters (getUTCHours, setUTCDate, ...) read as Jakarta's
// wall-clock fields, do all arithmetic with the UTC-explicit helpers below
// (never local Date methods), then convert back.

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Real UTC instant -> a Date whose UTC-getter fields are Jakarta wall-clock fields. */
export function toJakartaFields(utcInstant: Date): Date {
  return new Date(utcInstant.getTime() + JAKARTA_OFFSET_MS);
}

/** The inverse: Jakarta-wall-clock-as-UTC-fields -> the real UTC instant. */
export function fromJakartaFields(jakartaFields: Date): Date {
  return new Date(jakartaFields.getTime() - JAKARTA_OFFSET_MS);
}

export function nowInJakartaFields(): Date {
  return toJakartaFields(new Date());
}

/**
 * A Date usable with LOCAL-time functions (format, getHours, ...) that reads
 * as the given UTC instant's Asia/Jakarta wall-clock fields, regardless of
 * the device's own system timezone. Display-only — never store it or feed
 * it back into arithmetic (use the UTC-explicit helpers below, or
 * fromJakartaFields, for that).
 */
export function toJakartaDisplay(utcInstant: Date): Date {
  const fields = toJakartaFields(utcInstant);
  return new Date(
    fields.getUTCFullYear(),
    fields.getUTCMonth(),
    fields.getUTCDate(),
    fields.getUTCHours(),
    fields.getUTCMinutes(),
    fields.getUTCSeconds(),
    fields.getUTCMilliseconds()
  );
}

/** Current wall-clock time in Jakarta, as an unambiguous ISO 8601 string
 *  with an explicit +07:00 offset. */
export function nowInJakartaIso(): string {
  const f = nowInJakartaFields();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${f.getUTCFullYear()}-${pad(f.getUTCMonth() + 1)}-${pad(f.getUTCDate())}T${pad(
    f.getUTCHours()
  )}:${pad(f.getUTCMinutes())}:${pad(f.getUTCSeconds())}+07:00`;
}

/** [start, end] of "today" in Jakarta, as real UTC instants — for querying
 *  a timestamptz column against the user's actual calendar day. */
export function todayBoundsInJakarta(): { start: Date; end: Date } {
  const fields = startOfUTCDay(nowInJakartaFields());
  const start = fromJakartaFields(fields);
  const end = fromJakartaFields(addUTCDays(fields, 1) as Date).getTime() - 1;
  return { start, end: new Date(end) };
}

/** Today's date in Jakarta as "yyyy-mm-dd" — comparable lexicographically
 *  against a plain date column like checklists.target_date. */
export function todayJakartaDateString(): string {
  const f = nowInJakartaFields();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${f.getUTCFullYear()}-${pad(f.getUTCMonth() + 1)}-${pad(f.getUTCDate())}`;
}

// --- UTC-explicit date arithmetic (use these instead of local
// setHours/startOfDay/addDays/etc. on "fields" Dates) -----------------------

export function setUTCTime(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

export function setUTCMinute(date: Date, minute: number): Date {
  const d = new Date(date);
  d.setUTCMinutes(minute);
  return d;
}

export function startOfUTCDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function setUTCDateOfMonth(date: Date, day: number): Date {
  const d = new Date(date);
  d.setUTCDate(day);
  return d;
}

export function addUTCDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + amount);
  return d;
}

// Mirrors date-fns's addMonths: clamps to the last day of the target month
// instead of letting native Date overflow into the following month.
export function addUTCMonths(date: Date, amount: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + amount);
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d;
}

export function addUTCYears(date: Date, amount: number): Date {
  return addUTCMonths(date, amount * 12);
}
