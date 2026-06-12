export function AppTopbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex min-h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-zinc-500">Open POS</p>
          <p className="text-base font-semibold text-zinc-950">Workspace</p>
        </div>
        <div className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700">
          Owner
        </div>
      </div>
    </header>
  );
}
