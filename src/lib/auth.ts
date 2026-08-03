import { supabase } from "./supabase";

/** OAuth redirect target — must match Supabase Auth redirect allow-list. */
export function getAuthRedirectUrl(): string {
  return window.location.origin;
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });

  return { error: error ?? null };
}
