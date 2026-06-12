import { supabaseAdmin } from "@/lib/supabase/admin";

export type Organization = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  return data ?? [];
}
