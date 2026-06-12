import { connection } from "next/server";

import { getOrganizations } from "@/lib/database/organizations";

export default async function DashboardPage() {
  await connection();

  const organizations = await getOrganizations();
  const organizationCount = organizations.length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-950">Dashboard</h1>
      <p className="mt-2 text-zinc-600">
        Ringkasan awal operasional Open POS akan ditampilkan di sini.
      </p>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-950">
          Koneksi Supabase
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Organization ditemukan:{" "}
          <span className="font-semibold text-zinc-950">
            {organizationCount}
          </span>
        </p>
        {organizationCount === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Belum ada organization</p>
        ) : null}
      </section>
    </div>
  );
}
