import { supabase } from "./supabase";
import type { Category } from "./types";

// Mirrors the PWA's getCategories (src/lib/data/queries.ts) — a user's own
// categories plus the system defaults (user_id null), RLS-scoped either way.
export async function getCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}
