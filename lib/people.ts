import { supabase } from "./supabase";

// Resolves display nicknames via the get_shared_member_nicknames RPC (see
// D:\APP\ingatin\supabase\migrations\0046_shared_member_nicknames.sql) — a
// native client can't read another user's auth.users row directly the way
// the PWA's server-side resolveNickname() does with the admin client. The
// RPC only ever returns a nickname for someone who actually shares a trip,
// checklist, or reminder with the caller, so this is safe to call with any
// mix of owner/collaborator ids from any of those three features.
export async function getMemberNicknames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.rpc("get_shared_member_nicknames", { p_user_ids: userIds });
  if (error) throw error;
  return Object.fromEntries((data as { user_id: string; nickname: string }[]).map((r) => [r.user_id, r.nickname]));
}
