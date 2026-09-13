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

export function formatReminderDueAt(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
