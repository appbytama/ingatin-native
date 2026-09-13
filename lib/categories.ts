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

export async function createCategory(userId: string, name: string, icon?: string): Promise<string> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: name.trim(), icon: icon || "📁" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
