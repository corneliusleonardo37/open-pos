import { supabaseAdmin } from "@/lib/supabase/admin";

export type UserRole = "Owner" | "Kasir";
export type UserStatus = "Aktif" | "Nonaktif";

export type BranchOption = {
  id: string;
  name: string;
};

export type AppUser = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  branch_name: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export async function getBranchesByOrganization(
  organizationId: string,
): Promise<BranchOption[]> {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }

  return (data ?? []) as BranchOption[];
}

async function getBranchNameMap(organizationId: string) {
  const branches = await getBranchesByOrganization(organizationId);

  return new Map(branches.map((branch) => [branch.id, branch.name]));
}

function mapProfileRows(
  profiles: ProfileRow[],
  branchNames: Map<string, string>,
): AppUser[] {
  return profiles.map((profile) => ({
    ...profile,
    branch_name: profile.branch_id
      ? branchNames.get(profile.branch_id) ?? null
      : null,
  }));
}

export async function getUsersByOrganization(
  organizationId: string,
): Promise<AppUser[]> {
  const [{ data, error }, branchNames] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "id, organization_id, branch_id, full_name, email, role, status, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    getBranchNameMap(organizationId),
  ]);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return mapProfileRows((data ?? []) as ProfileRow[], branchNames);
}

export async function getUserByIdForOrganization(
  userId: string,
  organizationId: string,
): Promise<AppUser | null> {
  const [{ data, error }, branchNames] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "id, organization_id, branch_id, full_name, email, role, status, created_at, updated_at",
      )
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    getBranchNameMap(organizationId),
  ]);

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapProfileRows([data as ProfileRow], branchNames)[0] ?? null;
}

export async function branchBelongsToOrganization(
  branchId: string,
  organizationId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate branch: ${error.message}`);
  }

  return Boolean(data);
}
