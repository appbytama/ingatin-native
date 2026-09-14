import { supabase } from "./supabase";
import type { AssistantChatMessage, AssistantDraft, AssistantTurnResult, ChatMessageRef } from "./types";

// Talks to the `assistant` Supabase Edge Function — supabase-js's
// functions.invoke() automatically forwards this client's own session
// access token as the Authorization header, so the function runs
// RLS-scoped as this user (never the service role).
export interface AssistantHistory {
  history: AssistantChatMessage[];
  greeting: { text: string; refs?: ChatMessageRef[] } | null;
}

export async function getAssistantHistory(): Promise<AssistantHistory> {
  const { data, error } = await supabase.functions.invoke("assistant", { method: "GET" });
  if (error) throw error;
  return data;
}

export async function sendAssistantMessage(
  messages: AssistantChatMessage[],
  draft: AssistantDraft | null
): Promise<AssistantTurnResult> {
  const { data, error } = await supabase.functions.invoke("assistant", {
    method: "POST",
    body: { messages, draft },
  });
  if (error) throw error;
  return data;
}

// Mirrors the PWA's deleteChatHistory server action — a plain RLS-scoped
// soft-delete, no service role needed, so native calls it directly.
export async function deleteChatHistory() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login.");

  const { error } = await supabase
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) throw error;
}
