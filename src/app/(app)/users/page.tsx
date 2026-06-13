import Link from "next/link";
import { redirect } from "next/navigation";

import { deactivateUserAction } from "@/app/(app)/users/actions";
import { PasswordResetForm } from "@/app/(app)/users/password-reset-form";
import { UserForm } from "@/app/(app)/users/user-form";
import { getCurrentUserProfile } from "@/lib/database/profiles";
import {
  getBranchesByOrganization,
  getUserByIdForOrganization,
  getUsersByOrganization,
} from "@/lib/database/users";

type UsersPageProps = {
  searchParams: Promise<{
    created?: string | string[];
    edit?: string | string[];
  }>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function UsersError({ message }: { message: string }) {
  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-semibold text-zinc-950">
        User Management
      </h1>
      <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">
          User belum bisa dimuat
        </h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </section>
    </div>
  );
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const createdValue = getSearchParamValue(params.created);
  const userCreated = Boolean(createdValue);
  const editingUserId = getSearchParamValue(params.edit).trim();
  let users: Awaited<ReturnType<typeof getUsersByOrganization>> = [];
  let branches: Awaited<ReturnType<typeof getBranchesByOrganization>> = [];
  let editingUser: Awaited<ReturnType<typeof getUserByIdForOrganization>> =
    null;
  let errorMessage: string | null = null;

  try {
    [users, branches, editingUser] = await Promise.all([
      getUsersByOrganization(profile.organization_id),
      getBranchesByOrganization(profile.organization_id),
      editingUserId
        ? getUserByIdForOrganization(editingUserId, profile.organization_id)
        : Promise.resolve(null),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi error saat membaca user.";
  }

  if (errorMessage) {
    return <UsersError message={errorMessage} />;
  }

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">
            User Management
          </h1>
          <p className="mt-2 text-zinc-600">
            Kelola user aplikasi, role, branch, status, dan password awal.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-950">
          {editingUser ? "Edit user" : "Tambah user"}
        </h2>
        {branches.length === 0 ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Belum ada branch. User Owner masih bisa dibuat tanpa branch, tetapi
            Kasir membutuhkan branch untuk operasional.
          </p>
        ) : null}
        {userCreated ? (
          <p
            role="status"
            className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            User baru berhasil dibuat dan daftar user sudah diperbarui.
          </p>
        ) : null}
        <UserForm
          key={editingUser?.id ?? `create-user-${createdValue || "new"}`}
          user={editingUser}
          branches={branches}
        />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">Daftar user</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {users.length} user ditemukan di organization ini.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-3 pr-4 font-semibold">Nama</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Branch</th>
                <th className="py-3 pr-4 font-semibold">Created at</th>
                <th className="py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-zinc-500" colSpan={7}>
                    Belum ada user.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-zinc-950">
                        {user.full_name}
                      </p>
                      <p className="mt-1 max-w-40 truncate font-mono text-xs text-zinc-500">
                        {user.id}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-zinc-700">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                          user.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600",
                        ].join(" ")}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-700">
                      {user.branch_name ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-zinc-700">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/users?edit=${user.id}`}
                          className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        >
                          Edit
                        </Link>
                        {user.status === "Aktif" && user.id !== profile.id ? (
                          <form action={deactivateUserAction}>
                            <input
                              type="hidden"
                              name="user_id"
                              value={user.id}
                            />
                            <button
                              type="submit"
                              className="min-h-10 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                              Nonaktifkan
                            </button>
                          </form>
                        ) : null}
                        <details className="text-left">
                          <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                            Password
                          </summary>
                          <div className="mt-2 w-56 rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                            <PasswordResetForm userId={user.id} />
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
