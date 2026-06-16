import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AdminAccessState =
  | { mode: "prototype"; isAdmin: true; reason: "supabase-not-configured" }
  | { mode: "supabase"; isAdmin: true; userId: string }
  | { mode: "supabase"; isAdmin: false; reason: "not-signed-in" | "not-admin" };

export async function getAdminAccessState(): Promise<AdminAccessState> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { mode: "prototype", isAdmin: true, reason: "supabase-not-configured" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { mode: "prototype", isAdmin: true, reason: "supabase-not-configured" };

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { mode: "supabase", isAdmin: false, reason: "not-signed-in" };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return { mode: "supabase", isAdmin: false, reason: "not-admin" };
  }

  return { mode: "supabase", isAdmin: true, userId: user.id };
}
