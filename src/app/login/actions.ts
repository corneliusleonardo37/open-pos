"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { setAuthSessionCookies } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type LoginState = {
  error: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return { error: "Login gagal. Periksa email dan password." };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, status")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "Aktif") {
    return { error: "Akun tidak aktif atau belum terhubung ke aplikasi." };
  }

  await setAuthSessionCookies(data.session);

  redirect("/dashboard");
}
