"use server";

import { redirect } from "next/navigation";

import {
  clearAuthSessionCookies,
  getAuthAccessToken,
} from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logoutAction() {
  const accessToken = await getAuthAccessToken();

  try {
    if (accessToken) {
      await supabaseAdmin.auth.admin.signOut(accessToken);
    }
  } finally {
    await clearAuthSessionCookies();
  }

  redirect("/login");
}
