import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-zinc-50 text-zinc-950">
      <AppSidebar variant="desktop" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <AppSidebar variant="mobile" />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
