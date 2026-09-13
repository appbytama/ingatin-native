import { supabase } from "./supabase";
import type { Trip, TripMember, TripItineraryItem, TripExpense } from "./types";

// RLS (trips_select) already scopes this to owner OR is_trip_member — no
// .eq("owner_id", ...) filter needed, same pattern as reminders/checklists.
export async function getTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTrip(input: {
  title: string;
  destination?: string | null;
  startDate?: string | null; // yyyy-mm-dd
  endDate?: string | null;
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { data, error } = await supabase
    .from("trips")
    .insert({
      owner_id: user.id,
      title: input.title,
      destination: input.destination || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function deleteTrip(id: string) {
  const { error } = await supabase.from("trips").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export interface TripDetail {
  trip: Trip;
  members: TripMember[];
  itinerary: TripItineraryItem[];
  expenses: TripExpense[];
  nicknames: Record<string, string>;
}

export async function getTripDetail(tripId: string): Promise<TripDetail> {
  const [{ data: trip, error: tripError }, { data: members, error: membersError }, { data: itinerary, error: itineraryError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_members").select("*").eq("trip_id", tripId),
      supabase
        .from("trip_itinerary_items")
        .select("*")
        .eq("trip_id", tripId)
        .is("deleted_at", null)
        .order("day_date", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("trip_expenses")
        .select("*, trip_expense_shares(*)")
        .eq("trip_id", tripId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

  if (tripError) throw tripError;
  if (membersError) throw membersError;
  if (itineraryError) throw itineraryError;
  if (expensesError) throw expensesError;

  const userIds = new Set<string>([
    trip.owner_id,
    ...members.map((m) => m.user_id),
    ...expenses.flatMap((e) => [e.payer_id, ...e.trip_expense_shares.map((s: { user_id: string }) => s.user_id)]).filter(Boolean),
  ]);

  const nicknames = await getMemberNicknames([...userIds]);

  return { trip, members, itinerary, expenses, nicknames };
}

// Resolves display nicknames via the get_shared_member_nicknames RPC (see
// D:\APP\ingatin\supabase\migrations\0046_shared_member_nicknames.sql) — a
// native client can't read another user's auth.users row directly the way
// the PWA's server-side resolveNickname() does with the admin client.
export async function getMemberNicknames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.rpc("get_shared_member_nicknames", { p_user_ids: userIds });
  if (error) throw error;
  return Object.fromEntries((data as { user_id: string; nickname: string }[]).map((r) => [r.user_id, r.nickname]));
}

export async function createTripInvite(tripId: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { data, error } = await supabase
    .from("trip_invites")
    .insert({ trip_id: tripId, created_by: user.id })
    .select("code")
    .single();

  if (error) throw error;
  return data.code as string;
}

export async function joinTripByCode(code: string): Promise<{ tripId: string; tripTitle: string }> {
  const { data, error } = await supabase.rpc("claim_trip_invite", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("Kode undangan tidak valid.");
  return { tripId: row.result_trip_id, tripTitle: row.result_trip_title };
}

export async function addItineraryItem(
  tripId: string,
  input: { dayDate: string; timeOfDay?: string | null; title: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { count } = await supabase
    .from("trip_itinerary_items")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .is("deleted_at", null);

  const { error } = await supabase.from("trip_itinerary_items").insert({
    trip_id: tripId,
    day_date: input.dayDate,
    time_of_day: input.timeOfDay || null,
    title: input.title,
    created_by: user.id,
    sort_order: count ?? 0,
  });

  if (error) throw error;
}

export async function deleteItineraryItem(id: string) {
  const { error } = await supabase
    .from("trip_itinerary_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// shareUserIds: everyone the expense is split between (typically all
// current members) — trip_expense_shares has no amount column, so each
// listed share is an equal slice of amount_total, computed client-side.
export async function addExpense(
  tripId: string,
  input: { description: string; amountTotal: number; payerId: string; shareUserIds: string[] }
) {
  const { data: expense, error } = await supabase
    .from("trip_expenses")
    .insert({
      trip_id: tripId,
      payer_id: input.payerId,
      description: input.description,
      amount_total: input.amountTotal,
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: sharesError } = await supabase
    .from("trip_expense_shares")
    .insert(input.shareUserIds.map((userId) => ({ expense_id: expense.id, user_id: userId })));

  if (sharesError) throw sharesError;
}

// Settling a share is restricted by RLS to the expense's payer or the trip
// organizer — a debtor can never self-mark their own share paid.
export async function setExpenseShareSettled(expenseId: string, userId: string, settled: boolean) {
  const { error } = await supabase
    .from("trip_expense_shares")
    .update({ settled_at: settled ? new Date().toISOString() : null })
    .eq("expense_id", expenseId)
    .eq("user_id", userId);
  if (error) throw error;
}
