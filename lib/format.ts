// Always displays in Asia/Jakarta regardless of the device's own timezone —
// Intl.DateTimeFormat's timeZone option handles this natively, so unlike
// lib/tz.ts (needed for date *arithmetic* to match the parser's business
// logic) display formatting doesn't need the manual offset trick.
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
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

export function formatReminderDueAt(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Just the time, e.g. "08:00" — matches the PWA's per-card time badge
 *  (the date itself is shown once per group, not repeated per card). */
export function formatReminderTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** "yyyy-mm-dd" in Jakarta wall-clock time — for grouping reminders by day. */
export function jakartaDateKey(iso: string): string {
  return jakartaDateKeyFormatter.format(new Date(iso));
}

/** "Senin, 14 September 2026" — full date-group header line. */
export function formatDateHeader(dateKey: string): string {
  return dateHeaderFormatter.format(new Date(`${dateKey}T12:00:00+07:00`));
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
