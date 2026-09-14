// Always displays in Asia/Jakarta regardless of the device's own timezone —
// Intl.DateTimeFormat's timeZone option handles this natively, so unlike
// lib/tz.ts (needed for date *arithmetic* to match the parser's business
// logic) display formatting doesn't need the manual offset trick.
//
// Time fields specifically use 'en-GB', not 'id-ID' — Intl's id-ID locale
// formats time with a "." separator (Indonesia's own convention), but the
// PWA uses date-fns' HH:mm, always a colon regardless of locale. en-GB
// happens to format 24h time the same way and was verified to produce
// "08:00", not "08.00".
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayMonthFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const dateHeaderFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const jakartaDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "Sel, 14 Sep 08:00" — full day+time, used where a date and time both
 *  need to show together outside a date-grouped list (e.g. a date/time
 *  picker button). */
export function formatReminderDueAt(iso: string): string {
  const date = new Date(iso);
  return `${dayMonthFormatter.format(date)} ${dateTimeFormatter.format(date)}`;
}

/** Just the time, e.g. "08:00" — matches the PWA's per-card time badge
 *  (the date itself is shown once per group, not repeated per card). */
export function formatReminderTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** "yyyy-mm-dd" in Jakarta wall-clock time — for grouping reminders by day. */
export function jakartaDateKey(iso: string): string {
  return jakartaDateKeyFormatter.format(new Date(iso));
}

/** "Senin, 14 September 2026" — full date-group header line. */
export function formatDateHeader(dateKey: string): string {
  return dateHeaderFormatter.format(new Date(`${dateKey}T12:00:00+07:00`));
}

/** "08:00" for a message sent today, "14 Sep, 08:00" otherwise — mirrors
 *  the PWA's formatMessageTime (assistant-fab.tsx) shown under each chat
 *  bubble. */
export function formatMessageTime(iso: string): string {
  const key = jakartaDateKey(iso);
  const today = jakartaDateKey(new Date().toISOString());
  if (key === today) return dateTimeFormatter.format(new Date(iso));
  return `${dayMonthFormatter.format(new Date(iso))}, ${dateTimeFormatter.format(new Date(iso))}`;
}

/** "Hari ini" / "Besok" badge, or null for anything further out — matches
 *  the PWA's date-group header (only these two relative labels observed). */
export function relativeDayLabel(dateKey: string): string | null {
  const today = jakartaDateKey(new Date().toISOString());
  const tomorrow = jakartaDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  if (dateKey === today) return 'Hari ini';
  if (dateKey === tomorrow) return 'Besok';
  return null;
}
