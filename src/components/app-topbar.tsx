import { logoutAction } from "@/app/(app)/actions";
import type { CurrentUserProfile } from "@/lib/database/profiles";

export function AppTopbar({
  fullName,
  role,
}: {
  fullName: CurrentUserProfile["full_name"];
  role: CurrentUserProfile["role"];
}) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-zinc-500">Open POS</p>
          <p className="text-base font-semibold text-zinc-950">Workspace</p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {fullName}
            </p>
            <p className="text-xs font-medium text-zinc-500">{role}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
