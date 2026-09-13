import { supabase } from "./supabase";
import type { Checklist, ChecklistItem } from "./types";

// Mirrors the PWA's getActiveChecklists (src/lib/data/queries.ts), scoped
// down for v1: no templates/sharing/trip-linkage yet (see the roadmap plan —
// those port in when checklist sharing/trips get their own pass).
// .is("trip_id", null) still applied since a trip checklist uses a
// different per-member check model (checklist_item_checks) this app
// doesn't build yet — showing one here would let a checkbox silently not
// match what the (future) trip screen shows.
export async function getActiveChecklists(): Promise<Checklist[]> {
  const { data, error } = await supabase
    .from("checklists")
    .select("*, categories(name, icon), checklist_items(*)")
    .eq("status", "active")
    .is("deleted_at", null)
    .is("trip_id", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Nested embeds aren't reliably filterable in the query itself — drop
  // soft-deleted items in JS after the fetch, same as the PWA does.
  return (data as Checklist[]).map((checklist) => ({
    ...checklist,
    checklist_items: checklist.checklist_items
      .filter((item: ChecklistItem) => !item.deleted_at)
      .sort((a: ChecklistItem, b: ChecklistItem) => a.sort_order - b.sort_order),
  }));
}

export async function createChecklist(title: string, categoryId?: string | null): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { data, error } = await supabase
    .from("checklists")
    .insert({ user_id: user.id, title, category_id: categoryId || null })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function addChecklistItem(checklistId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return;

  const { count } = await supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("checklist_id", checklistId)
    .is("deleted_at", null);

  const { error } = await supabase
    .from("checklist_items")
    .insert({ checklist_id: checklistId, label: trimmed, sort_order: count ?? 0 });

  if (error) throw error;
}

export async function toggleChecklistItem(itemId: string, isChecked: boolean) {
  const { error } = await supabase.from("checklist_items").update({ is_checked: isChecked }).eq("id", itemId);
  if (error) throw error;
}

export async function deleteChecklistItem(itemId: string) {
  const { error } = await supabase
    .from("checklist_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}

export async function updateChecklistTitle(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Judul gak boleh kosong.");

  const { error } = await supabase
    .from("checklists")
    .update({ title: trimmed.slice(0, 120) })
    .eq("id", id);

  if (error) throw error;
}

export async function archiveChecklist(id: string) {
  const { error } = await supabase.from("checklists").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}

export async function deleteChecklist(id: string) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("checklists").update({ deleted_at: now }).eq("id", id);
  if (error) throw error;

  // Event Mode's H-7..H0 reminder chain is only linked via
  // linked_checklist_id, not a DB cascade — soft-deleting the checklist
  // doesn't stop those reminders from firing unless done explicitly here.
  await supabase.from("reminders").update({ deleted_at: now }).eq("linked_checklist_id", id).is("deleted_at", null);
}
