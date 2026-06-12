import { getAuthAccessToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CurrentUserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "Owner" | "Kasir";
  status: "Aktif" | "Nonaktif";
  organization_id: string;
  branch_id: string | null;
};

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, role, status, organization_id, branch_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CurrentUserProfile;
}
