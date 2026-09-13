import { supabase } from "./supabase";
import type { Reminder, RecurrenceRule, RelativeTrigger, ReminderStatus } from "./types";

const PAST_GRACE_MS = 60_000; // tolerate small submit/network lag, not a real backdate

function assertNotPastDue(dueAtIso: string) {
  if (new Date(dueAtIso).getTime() < Date.now() - PAST_GRACE_MS) {
    throw new Error("Waktu reminder gak boleh di masa lalu.");
  }
}

// A genuine rolling 24-hour window from right now, not "today's calendar
// day" — see the PWA's getUpcomingReminders (src/lib/data/queries.ts) for
// why. No .eq("user_id", ...) filter: reminders_select RLS (owner OR
// linked-checklist/trip member OR direct collaborator) is what scopes this.
export async function getUpcomingReminders(): Promise<Reminder[]> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("reminders")
    .select("*, categories(name, icon)")
    .is("deleted_at", null)
    .gte("due_at", now.toISOString())
    .lte("due_at", in24h.toISOString())
    .order("due_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Reminders that were due but never got marked done/skipped — the app's own
// safety net for missed/delayed push delivery. Capped at 20.
export async function getMissedReminders(): Promise<Pick<Reminder, "id" | "title" | "due_at">[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, due_at")
    .eq("status", "pending")
    .is("deleted_at", null)
    .lt("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getAllReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*, categories(name, icon)")
    .is("deleted_at", null)
    .order("due_at", { ascending: true });

  if (error) throw error;
  return data;
}

export interface CreateReminderInput {
  title: string;
  notes?: string;
  dueAt: string; // ISO
  categoryId?: string | null;
  recurrenceRule?: RecurrenceRule | null;
  relativeTrigger?: RelativeTrigger | null;
  recurrenceTemplateId?: string | null;
}

export async function createReminder(input: CreateReminderInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  assertNotPastDue(input.dueAt);

  const { error } = await supabase.from("reminders").insert({
    user_id: user.id,
    title: input.title,
    notes: input.notes || null,
    due_at: input.dueAt,
    category_id: input.categoryId || null,
    recurrence_rule: input.recurrenceRule ?? null,
    relative_trigger: input.relativeTrigger ?? null,
    recurrence_template_id: input.recurrenceTemplateId ?? null,
  });

  if (error) throw error;
}

// Mirrors the PWA's setReminderStatus (src/app/actions/reminders.ts): a
// recurring reminder marked "done" needs to roll forward via the
// fire_recurring_reminder RPC instead of a plain status update, but only
// takes over the rollover when push-dispatch's own escalation timeout
// hasn't already handled this occurrence (checked via notification_log).
export async function setReminderStatus(id: string, status: ReminderStatus) {
  if (status === "done") {
    const { data: reminder } = await supabase
      .from("reminders")
      .select("recurrence_rule, due_at, event_stage, linked_trip_id")
      .eq("id", id)
      .single();

    if (reminder?.recurrence_rule) {
      const MAX_ESCALATIONS = 3;
      const isEscalatable = !reminder.event_stage && !reminder.linked_trip_id;
      const finalStage = isEscalatable ? `escalate-${MAX_ESCALATIONS}` : "ontime";

      const { data: alreadyRolled } = await supabase
        .from("notification_log")
        .select("id")
        .eq("reminder_id", id)
        .eq("occurrence_at", reminder.due_at)
        .eq("stage", finalStage)
        .maybeSingle();

      if (!alreadyRolled) {
        // p_confirmed: true — the user explicitly marked this done. Matters
        // for a fixed-count (installment) reminder's FINAL occurrence:
        // confirmed marks it done, unconfirmed leaves it pending/overdue
        // instead of silently implying "paid".
        const { error } = await supabase.rpc("fire_recurring_reminder", {
          p_reminder_id: id,
          p_confirmed: true,
        });
        if (error) throw error;
        return;
      }
    }
  }

  const { error } = await supabase.from("reminders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function snoozeReminder(id: string, newDueAtIso: string) {
  assertNotPastDue(newDueAtIso);

  const { error } = await supabase
    .from("reminders")
    .update({ due_at: newDueAtIso, status: "pending" })
    .eq("id", id);

  if (error) throw error;
}

export async function updateReminderTitle(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Judul gak boleh kosong.");

  const { error } = await supabase
    .from("reminders")
    .update({ title: trimmed.slice(0, 120) })
    .eq("id", id);

  if (error) throw error;
}

export async function updateReminderDueAt(id: string, dueAtIso: string) {
  assertNotPastDue(dueAtIso);

  const { error } = await supabase
    .from("reminders")
    .update({ due_at: dueAtIso, status: "pending" })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteReminder(id: string) {
  const { error } = await supabase
    .from("reminders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
