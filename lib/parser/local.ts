// Ported verbatim (import paths adjusted) from the Ingatin PWA's
// src/lib/parser/local.ts. Rule-based Indonesian natural-language parser for
// the Quick Add box. Runs entirely on-device, no network call. Ambiguous
// input can be escalated to a Gemini fallback (see the PWA's
// src/app/api/parse/route.ts) once this app's chat/assistant phase exists —
// see ambiguous: true in the result.
//
// All date arithmetic here happens in "Jakarta fields" space (see ../tz.ts)
// using UTC-explicit helpers, never system-local Date methods — the real
// `now` passed in and the `dueAt` returned are the only points that cross
// back to real UTC instants.

import {
  addUTCDays,
  addUTCMonths,
  addUTCYears,
  fromJakartaFields,
  nowInJakartaFields,
  setUTCDateOfMonth,
  setUTCMinute,
  setUTCTime,
  startOfUTCDay,
  toJakartaFields,
} from "../tz";
import type { RecurrenceRule, RelativeTrigger } from "../types";

const MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

const WEEKDAYS: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};

const UNIT_TO_RULE: Record<string, RecurrenceRule["interval_unit"]> = {
  hari: "day", minggu: "week", bulan: "month", tahun: "year",
};

export interface ParsedQuickAdd {
  title: string;
  dueAt: Date | null;
  recurrenceRule: RecurrenceRule | null;
  relativeTrigger: RelativeTrigger | null;
  /** true when we couldn't confidently resolve a date/time and should
   *  either ask the user to pick manually or fall back to Gemini. */
  ambiguous: boolean;
}

function stripMatch(text: string, match: RegExpMatchArray): string {
  return (text.slice(0, match.index) + text.slice(match.index! + match[0].length))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyTimeOfDay(date: Date, hour: number, period?: string): Date {
  let h = hour;
  if (period) {
    const p = period.toLowerCase();
    if ((p === "sore" || p === "malam") && h < 12) h += 12;
    if (p === "siang" && h < 12 && h !== 12) h += h < 6 ? 12 : 0;
    if (p === "pagi" && h === 12) h = 0;
  }
  return setUTCTime(date, h, 0);
}

const TIME_RE = /\b(?:jam|pukul)\s+(\d{1,2})(?::(\d{2}))?\s*(pagi|siang|sore|malam)?\b/i;
const TIME_ISO_RE = /\b(\d{1,2}):(\d{2})\b/;

function parseTime(text: string, base: Date): { date: Date; rest: string } | null {
  let m = text.match(TIME_RE);
  if (m) {
    const hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const date = applyTimeOfDay(setUTCMinute(base, minute), hour, m[3]);
    return { date, rest: stripMatch(text, m) };
  }
  m = text.match(TIME_ISO_RE);
  if (m) {
    const date = setUTCTime(base, parseInt(m[1], 10), parseInt(m[2], 10));
    return { date, rest: stripMatch(text, m) };
  }
  return null;
}

function monthPattern() {
  return Object.keys(MONTHS).join("|");
}

function weekdayPattern() {
  return Object.keys(WEEKDAYS).join("|");
}

interface DateParseResult {
  date: Date;
  rest: string;
  recurrence?: RecurrenceRule;
  /** true when `date` already carries a precise, intentional time-of-day
   *  (e.g. "10 menit lagi") that must not be overwritten by the 09:00 default. */
  hasTime?: boolean;
  /** true when the caller explicitly named a date (not just a bare time-of-day) —
   *  used to decide whether a past result should roll forward or stay ambiguous. */
  explicitDate?: boolean;
}

function parseExplicitDate(text: string, now: Date): DateParseResult | null {
  // "setiap tanggal 5" / "tiap tanggal 5" -> monthly recurrence
  let m = text.match(/\b(?:setiap|tiap)\s+tanggal\s+(\d{1,2})\b/i);
  if (m) {
    const day = parseInt(m[1], 10);
    let date = setUTCDateOfMonth(startOfUTCDay(now), day);
    if (date < now) date = setUTCDateOfMonth(addUTCMonths(date, 1), day);
    return {
      date,
      rest: stripMatch(text, m),
      recurrence: { type: "monthly" },
      explicitDate: true,
    };
  }

  // "setiap hari" / "setiap minggu" / "setiap bulan" / "setiap tahun"
  m = text.match(/\b(?:setiap|tiap)\s+(hari|minggu|bulan|tahun)\b/i);
  if (m) {
    const unit = m[1].toLowerCase();
    const typeMap: Record<string, RecurrenceRule["type"]> = {
      hari: "daily", minggu: "weekly", bulan: "monthly", tahun: "yearly",
    };
    return {
      date: startOfUTCDay(now),
      rest: stripMatch(text, m),
      recurrence: { type: typeMap[unit] },
      explicitDate: true,
    };
  }

  // "tiap N bulan/minggu/hari/tahun sekali"
  m = text.match(/\b(?:setiap|tiap)\s+(\d+)\s+(hari|minggu|bulan|tahun)(?:\s+sekali)?\b/i);
  if (m) {
    const value = parseInt(m[1], 10);
    const unit = UNIT_TO_RULE[m[2].toLowerCase()]!;
    return {
      date: startOfUTCDay(now),
      rest: stripMatch(text, m),
      recurrence: { type: "interval", interval_unit: unit, interval_value: value },
      explicitDate: true,
    };
  }

  // "N menit/jam lagi" -> relative one-off date-time (keeps time-of-day, not startOfDay)
  m = text.match(/\b(\d+)\s+(menit|jam)\s+lagi\b/i);
  if (m) {
    const value = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const date = new Date(now.getTime() + value * (unit === "menit" ? 60_000 : 3_600_000));
    return { date, rest: stripMatch(text, m), hasTime: true, explicitDate: true };
  }

  // "N hari/minggu/bulan/tahun lagi" -> relative one-off date
  m = text.match(/\b(\d+)\s+(hari|minggu|bulan|tahun)\s+lagi\b/i);
  if (m) {
    const value = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    let date = now;
    if (unit === "hari") date = addUTCDays(now, value);
    else if (unit === "minggu") date = addUTCDays(now, value * 7);
    else if (unit === "bulan") date = addUTCMonths(now, value);
    else if (unit === "tahun") date = addUTCYears(now, value);
    return { date, rest: stripMatch(text, m), explicitDate: true };
  }

  // "besok" / "lusa" / "hari ini"
  m = text.match(/\b(besok|lusa|hari ini)\b/i);
  if (m) {
    const word = m[1].toLowerCase();
    const date = word === "besok" ? addUTCDays(now, 1) : word === "lusa" ? addUTCDays(now, 2) : now;
    return { date: startOfUTCDay(date), rest: stripMatch(text, m), explicitDate: true };
  }

  // weekday name: "senin", "hari senin", "setiap senin" handled above for recurring
  m = text.match(new RegExp(`\\b(?:hari\\s+)?(${weekdayPattern()})\\b`, "i"));
  if (m) {
    const target = WEEKDAYS[m[1].toLowerCase()];
    const current = now.getUTCDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    return { date: startOfUTCDay(addUTCDays(now, diff)), rest: stripMatch(text, m), explicitDate: true };
  }

  // "tanggal 5 Januari" / "tanggal 5"
  m = text.match(new RegExp(`\\btanggal\\s+(\\d{1,2})(?:\\s+(${monthPattern()}))?\\b`, "i"));
  if (m) {
    const day = parseInt(m[1], 10);
    const monthName = m[2]?.toLowerCase();
    let date = startOfUTCDay(now);
    date = setUTCDateOfMonth(date, day);
    if (monthName) {
      date = new Date(Date.UTC(date.getUTCFullYear(), MONTHS[monthName], day));
    } else if (date < startOfUTCDay(now)) {
      date = setUTCDateOfMonth(addUTCMonths(date, 1), day);
    }
    return { date, rest: stripMatch(text, m), explicitDate: true };
  }

  // "5 Januari" / "5 Januari 2027"
  m = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern()})(?:\\s+(\\d{4}))?\\b`, "i"));
  if (m) {
    const day = parseInt(m[1], 10);
    const month = MONTHS[m[2].toLowerCase()];
    const year = m[3] ? parseInt(m[3], 10) : now.getUTCFullYear();
    return { date: new Date(Date.UTC(year, month, day)), rest: stripMatch(text, m), explicitDate: true };
  }

  // dd/mm or dd/mm/yyyy or dd-mm-yyyy
  m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : now.getUTCFullYear();
    return { date: new Date(Date.UTC(year, month, day)), rest: stripMatch(text, m), explicitDate: true };
  }

  return null;
}

function parseRelativeAnchor(text: string): { trigger: RelativeTrigger; rest: string } | null {
  // "sehari sebelum <anchor>" / "N hari sebelum <anchor>"
  let m = text.match(/\b(?:(\d+)\s+hari|sehari)\s+sebelum\s+(.+)$/i);
  if (m) {
    const offset = m[1] ? -parseInt(m[1], 10) : -1;
    const anchorLabel = m[2].trim();
    return {
      trigger: { anchor_label: anchorLabel, anchor_date: null, offset_days: offset },
      rest: stripMatch(text, m),
    };
  }
  // "H-N dari <anchor>" / "H-N <anchor>"
  m = text.match(/\bH-(\d+)\s+(?:dari\s+)?(.+)$/i);
  if (m) {
    return {
      trigger: {
        anchor_label: m[2].trim(),
        anchor_date: null,
        offset_days: -parseInt(m[1], 10),
      },
      rest: stripMatch(text, m),
    };
  }
  return null;
}

const LEADING_VERBS_RE = /^(ingatkan(?:\s+aku|\s+saya)?|ingetin|ingat)\s+(?:aku\s+|saya\s+)?(?:untuk\s+|buat\s+)?/i;

function cleanTitle(raw: string): string {
  let title = raw.replace(LEADING_VERBS_RE, "").trim();
  title = title.replace(/^(untuk|buat)\s+/i, "").trim();
  title = title.replace(/[,.\s]+$/, "").trim();
  if (title.length === 0) return raw.trim();
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  const jakartaNow = toJakartaFields(now);
  let text = input.trim();

  const relative = parseRelativeAnchor(text);
  if (relative) {
    text = relative.rest;
    const timeMatch = parseTime(text, jakartaNow);
    if (timeMatch) text = timeMatch.rest;
    return {
      title: cleanTitle(text),
      dueAt: null,
      recurrenceRule: null,
      relativeTrigger: relative.trigger,
      ambiguous: true, // needs an anchor date resolved by the UI before saving
    };
  }

  const dateResult = parseExplicitDate(text, jakartaNow);
  let dueAtFields: Date | null = null;
  let recurrenceRule: RecurrenceRule | null = null;
  let hadExplicitDate = false;

  if (dateResult) {
    text = dateResult.rest;
    dueAtFields = dateResult.date;
    recurrenceRule = dateResult.recurrence ?? null;
    hadExplicitDate = dateResult.explicitDate ?? false;

    const timeMatch = parseTime(text, dueAtFields);
    if (timeMatch) {
      dueAtFields = timeMatch.date;
      text = timeMatch.rest;
    } else if (!recurrenceRule && !dateResult.hasTime) {
      dueAtFields = applyTimeOfDay(dueAtFields, 9); // default 09:00 when no time given
    }
  } else {
    const timeMatch = parseTime(text, jakartaNow);
    if (timeMatch) {
      dueAtFields = timeMatch.date;
      text = timeMatch.rest;
      // A bare time-of-day with no date ("jam 10") implicitly means "today,
      // or tomorrow if that's already passed" — never silently backdate it.
      if (dueAtFields <= jakartaNow) {
        dueAtFields = addUTCDays(dueAtFields, 1);
      }
    }
  }

  // Defense in depth: a recognized-but-past one-off date (e.g. a weekday/date
  // match that still lands earlier than `now` due to an edge case) must
  // never silently become a backdated reminder — surface it as ambiguous
  // instead of guessing.
  const isPast = dueAtFields !== null && !recurrenceRule && dueAtFields < jakartaNow;
  if (isPast && hadExplicitDate) {
    dueAtFields = null;
  }

  return {
    title: cleanTitle(text),
    dueAt: dueAtFields ? fromJakartaFields(dueAtFields) : null,
    recurrenceRule,
    relativeTrigger: null,
    ambiguous: dueAtFields === null,
  };
}

// --- Follow-up turn helpers (for a future chat assistant) -------------------
// A "follow-up" is the user's reply to a clarifying question
// ("mau kasih kategori atau bikin berulang?"), so these are deliberately
// narrower / more literal than the full parseQuickAdd above.

const SKIP_RE =
  /^\s*(?:(?:gak|ga|nggak|enggak|tidak|engga)\s*(?:usah|perlu|apa-?apa)?|nope?|no|skip|udah(?:\s*(?:aja|cukup))?|cukup(?:\s*(?:aja|itu))?|segitu(?:\s*aja)?)\s*[.!]*\s*$/i;

/** True when the user's reply is a plain "no thanks" to a clarifying question. */
export function detectSkipIntent(text: string): boolean {
  return SKIP_RE.test(text.trim());
}

/** Finds a category the user named in free text, by simple substring match. */
export function matchCategory<T extends { id: string; name: string }>(
  text: string,
  categories: T[]
): T | null {
  const lower = text.toLowerCase();
  return (
    categories.find((c) => c.name.length > 2 && lower.includes(c.name.toLowerCase())) ?? null
  );
}

/** Extracts just a recurrence rule from free text (no date), e.g. a reply
 *  like "setiap bulan" or "tiap 3 bulan sekali" to a clarifying question. */
export function parseRecurrenceFollowUp(text: string): RecurrenceRule | null {
  const result = parseExplicitDate(text, nowInJakartaFields());
  return result?.recurrence ?? null;
}
