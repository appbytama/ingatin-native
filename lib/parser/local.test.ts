import { parseQuickAdd } from "./local";

const NOW = new Date(2026, 8, 1, 10, 0, 0); // 1 Sep 2026, Selasa

describe("parseQuickAdd", () => {
  it("parses explicit date + time", () => {
    const r = parseQuickAdd("Ingat bayar listrik tanggal 5 jam 8 pagi", NOW);
    expect(r.title).toBe("Bayar listrik");
    expect(r.dueAt?.getDate()).toBe(5);
    expect(r.dueAt?.getHours()).toBe(8);
    expect(r.recurrenceRule).toBeNull();
  });

  it("parses monthly recurrence from 'setiap tanggal N'", () => {
    const r = parseQuickAdd("Bayar internet setiap tanggal 5", NOW);
    expect(r.recurrenceRule).toEqual({ type: "monthly" });
    expect(r.dueAt?.getDate()).toBe(5);
  });

  it("parses relative offset 'N bulan lagi'", () => {
    const r = parseQuickAdd("Servis motor 3 bulan lagi", NOW);
    expect(r.title).toBe("Servis motor");
    expect(r.dueAt?.getMonth()).toBe(11); // Sep(8) + 3 = Dec(11)
    expect(r.dueAt?.getFullYear()).toBe(2026);
  });

  it("parses relative-to-anchor trigger 'sehari sebelum X'", () => {
    const r = parseQuickAdd("Beli kado sehari sebelum ulang tahun ibu", NOW);
    expect(r.relativeTrigger).toEqual({
      anchor_label: "ulang tahun ibu",
      anchor_date: null,
      offset_days: -1,
    });
    expect(r.ambiguous).toBe(true);
  });

  it("parses 'besok' as tomorrow", () => {
    const r = parseQuickAdd("Meeting besok jam 2 siang", NOW);
    expect(r.dueAt?.getDate()).toBe(2);
    expect(r.dueAt?.getHours()).toBe(14);
  });

  it("parses interval recurrence 'tiap 3 bulan sekali'", () => {
    const r = parseQuickAdd("Servis motor tiap 3 bulan sekali", NOW);
    expect(r.recurrenceRule).toEqual({
      type: "interval",
      interval_unit: "month",
      interval_value: 3,
    });
  });

  it("parses relative offset 'N menit lagi' without defaulting the time", () => {
    const r = parseQuickAdd("Bayar kopi 10 menit lagi", NOW);
    expect(r.title).toBe("Bayar kopi");
    expect(r.dueAt?.getTime()).toBe(NOW.getTime() + 10 * 60_000);
  });

  it("parses relative offset 'N jam lagi' without defaulting the time", () => {
    const r = parseQuickAdd("Angkat jemuran 2 jam lagi", NOW);
    expect(r.dueAt?.getTime()).toBe(NOW.getTime() + 2 * 3_600_000);
  });

  it("flags ambiguous input with no resolvable date", () => {
    const r = parseQuickAdd("Beli baju baru", NOW);
    expect(r.dueAt).toBeNull();
    expect(r.ambiguous).toBe(true);
  });

  // These two use an explicit UTC `now` and assert against an explicit UTC
  // epoch — unlike the tests above, they stay correct even if run on a
  // device/CI whose system timezone isn't Asia/Jakarta, which is exactly
  // the mismatch that caused reminders to land 7h off in production (PWA).
  it("resolves a time-of-day to the correct real UTC instant regardless of system timezone", () => {
    // 2026-09-01T03:00:00Z == 2026-09-01 10:00 WIB
    const nowUtc = new Date(Date.UTC(2026, 8, 1, 3, 0, 0));
    const r = parseQuickAdd("Meeting jam 3 sore", nowUtc);
    // "jam 3 sore" (15:00 WIB) on the same day == 2026-09-01T08:00:00Z
    expect(r.dueAt?.getTime()).toBe(Date.UTC(2026, 8, 1, 8, 0, 0));
  });

  it("rolls a bare time-of-day forward a day when it has already passed today", () => {
    // 2026-09-01T03:00:00Z == 2026-09-01 10:00 WIB
    const nowUtc = new Date(Date.UTC(2026, 8, 1, 3, 0, 0));
    const r = parseQuickAdd("Meeting jam 9 pagi", nowUtc);
    // 09:00 WIB already passed (it's 10:00 WIB) -> rolls to tomorrow 09:00 WIB
    // == 2026-09-02T02:00:00Z
    expect(r.dueAt?.getTime()).toBe(Date.UTC(2026, 8, 2, 2, 0, 0));
  });
});
