import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const AUTH_ACCESS_TOKEN_COOKIE = "open_pos_access_token";
export const AUTH_REFRESH_TOKEN_COOKIE = "open_pos_refresh_token";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setAuthSessionCookies(session: Session) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_ACCESS_TOKEN_COOKIE, session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in,
  });

  cookieStore.set(AUTH_REFRESH_TOKEN_COOKIE, session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getAuthAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get(AUTH_ACCESS_TOKEN_COOKIE)?.value ?? null;
}
