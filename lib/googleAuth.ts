import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

function getQueryParams(url: string) {
  const params: Record<string, string> = {};
  const [, queryString] = url.split("#");

  queryString?.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    params[key] = decodeURIComponent(value ?? "");
  });

  return params;
}

// Redirect URI changes with the environment (Expo Go's exp:// host, a dev
// client's custom scheme, or the web origin) — see DEV_NOTES.md for what
// that means for the Supabase/Google Cloud redirect allow-lists.
export async function signInWithGoogle() {
  const redirectTo = AuthSession.makeRedirectUri({ path: "google-auth" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "consent" },
    },
  });

  if (error || !data?.url) {
    throw error ?? new Error("Tidak bisa mendapatkan URL login Google");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    return null;
  }

  const params = getQueryParams(result.url);
  if (!params.access_token || !params.refresh_token) {
    throw new Error("Login Google tidak mengembalikan token yang valid");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });

  if (sessionError) {
    throw sessionError;
  }

  return true;
}
