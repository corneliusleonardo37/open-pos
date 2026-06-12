"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAuditLog } from "@/lib/database/audit";
import { getCurrentUserProfile } from "@/lib/database/profiles";
import {
  branchBelongsToOrganization,
  type UserRole,
  type UserStatus,
} from "@/lib/database/users";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type UserFormState = {
  error: string | null;
  values?: {
    full_name?: string;
    email?: string;
    role?: UserRole;
    branch_id?: string;
    status?: UserStatus;
  };
};

function readUserFormValues(formData: FormData): UserFormState["values"] {
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "Aktif");

  return {
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: role === "Owner" || role === "Kasir" ? role : undefined,
    branch_id: String(formData.get("branch_id") ?? "").trim(),
    status: status === "Aktif" || status === "Nonaktif" ? status : "Aktif",
  };
}

async function requireOwnerProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  return profile;
}

function readRequiredText(formData: FormData, field: string, label: string) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new Error(`${label} wajib diisi.`);
  }

  return value;
}

function readOptionalText(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").trim();

  return value || null;
}

function readRole(formData: FormData): UserRole {
  const role = String(formData.get("role") ?? "");

  if (role !== "Owner" && role !== "Kasir") {
    throw new Error("Role user tidak valid.");
  }

  return role;
}

function readStatus(formData: FormData): UserStatus {
  const status = String(formData.get("status") ?? "Aktif");

  if (status !== "Aktif" && status !== "Nonaktif") {
    throw new Error("Status user tidak valid.");
  }

  return status;
}

async function readBranchId(
  formData: FormData,
  organizationId: string,
  role: UserRole,
) {
  const branchId = readOptionalText(formData, "branch_id");

  if (!branchId) {
    if (role === "Kasir") {
      throw new Error("Branch wajib dipilih untuk Kasir.");
    }

    return null;
  }

  const isValidBranch = await branchBelongsToOrganization(
    branchId,
    organizationId,
  );

  if (!isValidBranch) {
    throw new Error("Branch tidak valid untuk organization ini.");
  }

  return branchId;
}

function readUserId(formData: FormData) {
  return readRequiredText(formData, "user_id", "User");
}

export async function createUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const profile = await requireOwnerProfile();
  const values = readUserFormValues(formData);

  try {
    const fullName = readRequiredText(formData, "full_name", "Nama");
    const email = readRequiredText(formData, "email", "Email").toLowerCase();
    const password = readRequiredText(
      formData,
      "password",
      "Password awal",
    );
    const role = readRole(formData);
    const branchId = await readBranchId(
      formData,
      profile.organization_id,
      role,
    );

    if (password.length < 6) {
      throw new Error("Password awal minimal 6 karakter.");
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
      });

    if (authError || !authData.user) {
      return {
        error: `Gagal membuat user auth: ${
          authError?.message ?? "data auth user tidak kembali"
        }`,
        values,
      };
    }

    const authUserId = authData.user.id;
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUserId,
        organization_id: profile.organization_id,
        branch_id: branchId,
        full_name: fullName,
        email,
        role,
        status: "Aktif",
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return {
        error: `User auth dibuat, tetapi profile gagal disimpan: ${profileError.message}`,
        values,
      };
    }

    await createAuditLog({
      profile,
      action: "create_user",
      entityType: "profiles",
      entityId: authUserId,
      metadata: {
        full_name: fullName,
        email,
        role,
        branch_id: branchId,
        status: "Aktif",
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Data user tidak valid.",
      values,
    };
  }

  revalidatePath("/users");
  redirect(`/users?created=${Date.now()}`);
}

export async function updateUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const profile = await requireOwnerProfile();

  try {
    const userId = readUserId(formData);
    const fullName = readRequiredText(formData, "full_name", "Nama");
    const role = readRole(formData);
    const status = readStatus(formData);
    const branchId = await readBranchId(
      formData,
      profile.organization_id,
      role,
    );

    if (userId === profile.id && (role !== "Owner" || status !== "Aktif")) {
      throw new Error("Tidak bisa mengubah role/status akun sendiri.");
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (existingUserError) {
      return {
        error: `Gagal membaca user: ${existingUserError.message}`,
      };
    }

    if (!existingUser) {
      throw new Error("User tidak ditemukan di organization ini.");
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        branch_id: branchId,
        status,
        updated_at: now,
      })
      .eq("id", userId)
      .eq("organization_id", profile.organization_id);

    if (updateError) {
      return { error: `Gagal mengubah user: ${updateError.message}` };
    }

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

    await createAuditLog({
      profile,
      action: "update_user",
      entityType: "profiles",
      entityId: userId,
      metadata: {
        full_name: fullName,
        role,
        branch_id: branchId,
        status,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Data user tidak valid.",
    };
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function deactivateUserAction(formData: FormData) {
  const profile = await requireOwnerProfile();
  const userId = readUserId(formData);

  if (userId === profile.id) {
    redirect("/users");
  }

  const { data: targetUser } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (targetUser) {
    await supabaseAdmin
      .from("profiles")
      .update({
        status: "Nonaktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("organization_id", profile.organization_id);

    await createAuditLog({
      profile,
      action: "deactivate_user",
      entityType: "profiles",
      entityId: userId,
      metadata: {
        full_name: String(targetUser.full_name),
        email: String(targetUser.email),
      },
    });
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function resetPasswordAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const profile = await requireOwnerProfile();

  try {
    const userId = readUserId(formData);
    const password = readRequiredText(
      formData,
      "password",
      "Password baru",
    );

    if (password.length < 6) {
      throw new Error("Password baru minimal 6 karakter.");
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (existingUserError) {
      return {
        error: `Gagal membaca user: ${existingUserError.message}`,
      };
    }

    if (!existingUser) {
      throw new Error("User tidak ditemukan di organization ini.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      return { error: `Gagal reset password: ${error.message}` };
    }

    await createAuditLog({
      profile,
      action: "reset_password",
      entityType: "profiles",
      entityId: userId,
      metadata: {
        email: String(existingUser.email),
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Password baru tidak valid.",
    };
  }

  revalidatePath("/users");
  redirect("/users");
}
