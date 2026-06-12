import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUserProfile } from "@/lib/database/profiles";

export default async function ApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return <AppShell currentUser={profile}>{children}</AppShell>;
}
