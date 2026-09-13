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

export type ChecklistStatus = "active" | "archived";

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  label: string;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
};

export type Checklist = {
  id: string;
  user_id: string;
  category_id: string | null;
  template_source_id: string | null;
  trip_id: string | null;
  is_private: boolean;
  title: string;
  target_date: string | null;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  status: ChecklistStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  categories: Pick<Category, "name" | "icon"> | null;
  checklist_items: ChecklistItem[];
};

export type TripStatus = "active" | "archived";
export type TripMemberRole = "organizer" | "member";

export type Trip = {
  id: string;
  owner_id: string;
  title: string;
  destination: string | null;
  cover_photo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  allow_member_invites: boolean;
  allow_member_checklists: boolean;
  status: TripStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TripMember = {
  trip_id: string;
  user_id: string;
  role: TripMemberRole;
  invited_by: string | null;
  joined_at: string;
};

export type TripItineraryItem = {
  id: string;
  trip_id: string;
  day_date: string; // yyyy-mm-dd
  time_of_day: string | null; // HH:MM
  title: string;
  created_by: string | null;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
};

export type TripExpense = {
  id: string;
  trip_id: string;
  payer_id: string | null;
  description: string;
  amount_total: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  trip_expense_shares: TripExpenseShare[];
};

export type TripExpenseShare = {
  expense_id: string;
  user_id: string;
  settled_at: string | null;
};

// Assistant ("Babel") chat — talks to the `assistant` Supabase Edge
// Function (D:\APP\ingatin\supabase\functions\assistant), not the PWA's
// deployed app. Scoped to reminder/checklist only for v1 (no trip actions
// yet, see the roadmap plan).
export type ChatMessageRef = { id: string; kind: "reminder" | "checklist" | "trip"; title: string; checklistId?: string };

export type AssistantChatMessage = {
  role: "user" | "assistant";
  text: string;
  refs?: ChatMessageRef[];
  createdAt?: string;
};

export type AssistantDraft = {
  kind: "reminder" | "checklist" | "trip";
  id: string;
  title: string;
  tripId?: string;
};

export type AssistantTurnResult = {
  reply: string;
  draft: AssistantDraft | null;
  done: boolean;
  refs?: ChatMessageRef[];
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
