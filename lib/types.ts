// Shared type shapes mirrored from the Ingatin PWA's
// src/lib/supabase/types.ts (hand-written to match its Postgres migrations —
// this file mirrors just the slice this app currently uses).

export type RecurrenceRule = {
  type: "none" | "daily" | "weekly" | "monthly" | "yearly" | "interval";
  interval_unit?: "day" | "week" | "month" | "year";
  interval_value?: number;
  // Fixed-count recurrence (installments: "cicilan bengkel, masih 5 kali
  // lagi") — omit all three for the default unbounded recurrence.
  occurrence_count?: number;
  occurrence_index?: number;
  base_title?: string;
  already_done?: number;
};

export type RelativeTrigger = {
  anchor_label: string;
  anchor_date: string | null; // ISO date
  offset_days: number;
};

export type EventStage = "H-7" | "H-3" | "H-1" | "H0";
export type ReminderStatus = "pending" | "done" | "skipped" | "snoozed";

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
};

export type Reminder = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  notes: string | null;
  due_at: string;
  recurrence_rule: RecurrenceRule | null;
  relative_trigger: RelativeTrigger | null;
  status: ReminderStatus;
  linked_checklist_id: string | null;
  linked_trip_id: string | null;
  event_stage: EventStage | null;
  recurrence_template_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  categories: Pick<Category, "name" | "icon"> | null;
};
