import { redirect } from "next/navigation";

import { getOrganizations } from "@/lib/database/organizations";
import { getCurrentUserProfile } from "@/lib/database/profiles";

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const organizations = await getOrganizations();
  const organizationCount = organizations.length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-950">Dashboard</h1>
      <p className="mt-2 text-zinc-600">
        Ringkasan awal operasional Open POS akan ditampilkan di sini.
      </p>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-950">User aktif</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-zinc-500">Nama</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-950">
              {profile.full_name}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Role</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-950">
              {profile.role}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Status</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-950">
              {profile.status}
            </dd>
          </div>
        </dl>
      </section>

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
