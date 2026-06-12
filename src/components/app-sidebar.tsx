"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { CurrentUserProfile } from "@/lib/database/profiles";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["Owner", "Kasir"] },
  { href: "/products", label: "Produk", roles: ["Owner"] },
  { href: "/stock-in", label: "Barang masuk", roles: ["Owner"] },
  { href: "/sales", label: "Penjualan", roles: ["Owner", "Kasir"] },
  { href: "/reports", label: "Laporan", roles: ["Owner"] },
  { href: "/audit-log", label: "Audit log", roles: ["Owner"] },
  { href: "/users", label: "User", roles: ["Owner"] },
];

function NavigationLink({
  href,
  label,
  compact = false,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={[
        "flex min-h-11 items-center rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
        compact ? "whitespace-nowrap px-3" : "px-3",
        isActive
          ? "bg-emerald-700 text-white"
          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppSidebar({
  role,
  variant = "desktop",
}: {
  role: CurrentUserProfile["role"];
  variant?: "desktop" | "mobile";
}) {
  const visibleNavigationItems = navigationItems.filter((item) =>
    item.roles.includes(role),
  );

  if (variant === "mobile") {
    return (
      <nav
        className="border-b border-zinc-200 bg-white px-4 py-3 lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleNavigationItems.map((item) => (
            <NavigationLink
              key={item.href}
              href={item.href}
              label={item.label}
              compact
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-5 lg:flex lg:flex-col">
      <div className="px-3">
        <p className="text-xl font-semibold text-zinc-950">Open POS</p>
        <p className="mt-1 text-sm text-zinc-500">Back office</p>
      </div>
      <nav className="mt-8 flex flex-col gap-1" aria-label="Main navigation">
        {visibleNavigationItems.map((item) => (
          <NavigationLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>
    </aside>
  );
}
