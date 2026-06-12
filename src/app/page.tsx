import { connection } from "next/server";

import { getOrganizations } from "@/lib/database/organizations";

export default async function Home() {
  await connection();

  const organizations = await getOrganizations();
  const organizationCount = organizations.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 font-sans text-zinc-950">
      <main className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Open POS</h1>
        <p className="mt-4 text-zinc-700">
          Organization ditemukan:{" "}
          <span className="font-semibold">{organizationCount}</span>
        </p>
        {organizationCount === 0 ? (
          <p className="mt-2 text-zinc-500">Belum ada organization</p>
        ) : null}
      </main>
    </div>
  );
}
