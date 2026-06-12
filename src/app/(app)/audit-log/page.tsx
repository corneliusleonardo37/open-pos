import Link from "next/link";
import { redirect } from "next/navigation";

import {
  type AuditLogEntry,
  getAuditLogs,
  resolveAuditLogFilters,
} from "@/lib/database/audit-logs";
import { getCurrentUserProfile } from "@/lib/database/profiles";

type AuditLogPageProps = {
  searchParams: Promise<{
    start_date?: string | string[];
    end_date?: string | string[];
    action?: string | string[];
    entity_type?: string | string[];
    keyword?: string | string[];
  }>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function stringifyMetadata(metadata: AuditLogEntry["metadata"]) {
  return JSON.stringify(metadata, null, 2);
}

function createMetadataSummary(metadata: AuditLogEntry["metadata"]) {
  const compactMetadata = JSON.stringify(metadata);

  if (!compactMetadata || compactMetadata === "{}") {
    return "{}";
  }

  return compactMetadata.length > 140
    ? `${compactMetadata.slice(0, 140)}...`
    : compactMetadata;
}

function AuditLogError({ message }: { message: string }) {
  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-semibold text-zinc-950">Audit log</h1>
      <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">
          Audit log belum bisa dimuat
        </h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </section>
    </div>
  );
}

function AuditLogsTable({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">
          100 audit log terbaru
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Jejak aktivitas penting sesuai filter yang dipilih.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4 font-semibold">Waktu</th>
              <th className="py-3 pr-4 font-semibold">Actor</th>
              <th className="py-3 pr-4 font-semibold">Action</th>
              <th className="py-3 pr-4 font-semibold">Entity type</th>
              <th className="py-3 pr-4 font-semibold">Entity ID</th>
              <th className="py-3 font-semibold">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-zinc-500" colSpan={6}>
                  Belum ada audit log yang cocok.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="py-3 pr-4 align-top text-zinc-600">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium text-zinc-950">
                      {log.actor_name}
                    </p>
                    {log.actor_profile_id ? (
                      <p className="mt-1 max-w-36 truncate text-xs text-zinc-500">
                        {log.actor_profile_id}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 pr-4 align-top text-zinc-700">
                    {log.entity_type}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <p className="max-w-48 truncate font-mono text-xs text-zinc-600">
                      {log.entity_id ?? "-"}
                    </p>
                  </td>
                  <td className="py-3 align-top">
                    <details>
                      <summary className="max-w-md cursor-pointer truncate font-mono text-xs text-zinc-700 outline-none focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                        {createMetadataSummary(log.metadata)}
                      </summary>
                      <pre className="mt-2 max-h-40 max-w-xl overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700">
                        <code>{stringifyMetadata(log.metadata)}</code>
                      </pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const filters = resolveAuditLogFilters({
    startDate: getSearchParamValue(params.start_date),
    endDate: getSearchParamValue(params.end_date),
    action: getSearchParamValue(params.action),
    entityType: getSearchParamValue(params.entity_type),
    keyword: getSearchParamValue(params.keyword),
  });
  let logs: AuditLogEntry[] = [];
  let errorMessage: string | null = null;

  try {
    logs = await getAuditLogs(profile, filters);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi error saat membaca audit log.";
  }

  if (errorMessage) {
    return <AuditLogError message={errorMessage} />;
  }

  const hasActiveFilter =
    filters.startDate ||
    filters.endDate ||
    filters.action ||
    filters.entityType ||
    filters.keyword;

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Audit log</h1>
          <p className="mt-2 text-zinc-600">
            Pantau jejak aktivitas penting berdasarkan user, action, entity,
            dan metadata.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-950">Filter</h2>
        <form
          action="/audit-log"
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto_auto]"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Tanggal awal
            <input
              type="date"
              name="start_date"
              defaultValue={filters.startDate}
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Tanggal akhir
            <input
              type="date"
              name="end_date"
              defaultValue={filters.endDate}
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Action
            <input
              name="action"
              defaultValue={filters.action}
              placeholder="sale_created"
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Entity type
            <input
              name="entity_type"
              defaultValue={filters.entityType}
              placeholder="sales"
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Keyword
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="invoice, produk, action"
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 self-end rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          >
            Terapkan
          </button>
          {hasActiveFilter ? (
            <Link
              href="/audit-log"
              className="inline-flex min-h-11 items-center justify-center self-end rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Reset
            </Link>
          ) : null}
        </form>
      </section>

      <div className="mt-6">
        <AuditLogsTable logs={logs} />
      </div>
    </div>
  );
}
