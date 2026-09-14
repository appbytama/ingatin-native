import { supabase } from "./supabase";
import { getMemberNicknames } from "./people";
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

export interface ReminderDetail {
  reminder: Reminder;
  isOwner: boolean;
  ownerNickname: string;
  collaborators: { userId: string; nickname: string }[];
}

// Mirrors the PWA's GET /api/reminders/[id] (read off reminder-item-body.tsx):
// the reminder row plus owner/collaborator nicknames. The PWA resolves
// those via its admin client; native uses get_shared_member_nicknames
// (lib/people.ts) instead, since a direct reminder share already makes the
// caller and the reminder's other people "share something" under that RPC.
export async function getReminderDetail(id: string): Promise<ReminderDetail> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { data: reminder, error } = await supabase
    .from("reminders")
    .select("*, categories(name, icon)")
    .eq("id", id)
    .single();
  if (error) throw error;

  const { data: collaboratorRows, error: collabError } = await supabase
    .from("reminder_collaborators")
    .select("user_id")
    .eq("reminder_id", id);
  if (collabError) throw collabError;

  const nicknames = await getMemberNicknames([reminder.user_id, ...collaboratorRows.map((c) => c.user_id)]);

  return {
    reminder,
    isOwner: reminder.user_id === user.id,
    ownerNickname: nicknames[reminder.user_id] ?? "kamu",
    collaborators: collaboratorRows.map((c) => ({ userId: c.user_id, nickname: nicknames[c.user_id] ?? c.user_id.slice(0, 8) })),
  };
}

export async function createReminderInvite(reminderId: string): Promise<{ code: string; expiresAt: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { data, error } = await supabase
    .from("reminder_invites")
    .insert({ reminder_id: reminderId, created_by: user.id })
    .select("code, expires_at")
    .single();

  if (error) throw error;
  return { code: data.code as string, expiresAt: data.expires_at as string };
}

const JOIN_ERROR_MESSAGES: Record<string, string> = {
  invite_expired: "Kode ini udah kedaluwarsa — minta kode baru ya.",
  invite_exhausted: "Kode ini udah gak berlaku lagi.",
  invite_not_found: "Kode gak ditemukan. Cek lagi penulisannya ya.",
  reminder_not_found: "Reminder yang diundang udah gak ada.",
  not_authenticated: "Sesi kamu abis — login lagi ya.",
};

export async function joinReminderByCode(code: string): Promise<{ reminderId: string; reminderTitle: string }> {
  const { data, error } = await supabase.rpc("claim_reminder_invite", { p_code: code.trim().toUpperCase() });
  if (error) throw new Error(JOIN_ERROR_MESSAGES[error.message] ?? "Gagal gabung reminder. Coba lagi ya.");
  const row = data?.[0];
  if (!row) throw new Error("Kode gak ditemukan. Cek lagi penulisannya ya.");
  return { reminderId: row.result_reminder_id, reminderTitle: row.result_reminder_title };
}

// Minimal checklist/trip details for Event Mode reminder-chain grouping on
// the Semua page (mirrors the PWA's getChecklistsByIds/getTripsByIds in
// src/lib/data/queries.ts) — deliberately NOT filtered to the caller's own
// active/non-trip checklists the way getActiveChecklists is, since a chain
// can link to a checklist that belongs to a trip or is archived and still
// needs a title/icon to group under. RLS still scopes visibility.
export async function getChecklistRefsByIds(ids: string[]): Promise<{ id: string; title: string; icon: string }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('checklists')
    .select('id, title, categories(icon)')
    .is('deleted_at', null)
    .in('id', ids);
  if (error) throw error;
  return (data as unknown as { id: string; title: string; categories: { icon: string }[] | null }[]).map((c) => ({
    id: c.id,
    title: c.title,
    icon: c.categories?.[0]?.icon || '📅',
  }));
}

export async function getTripRefsByIds(ids: string[]): Promise<{ id: string; title: string }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('trips').select('id, title').in('id', ids);
  if (error) throw error;
  return data;
}

export async function leaveSharedReminder(reminderId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { error } = await supabase
    .from("reminder_collaborators")
    .delete()
    .eq("reminder_id", reminderId)
    .eq("user_id", user.id);
  if (error) throw error;
}
