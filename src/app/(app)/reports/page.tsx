import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/database/profiles";
import {
  type PaymentMethod,
  type ReportItem,
  type ReportTransaction,
  getSalesReportData,
  resolveReportFilters,
} from "@/lib/database/reports";

type ReportsPageProps = {
  searchParams: Promise<{
    start_date?: string | string[];
    end_date?: string | string[];
  }>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-950">
        {value}
      </p>
    </section>
  );
}

function ReportError({ message }: { message: string }) {
  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-semibold text-zinc-950">
        Laporan Penjualan
      </h1>
      <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">
          Laporan belum bisa dimuat
        </h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </section>
    </div>
  );
}

function PaymentBreakdownTable({
  breakdown,
}: {
  breakdown: Record<
    PaymentMethod,
    {
      total: number;
      transaction_count: number;
    }
  >;
}) {
  const methods: PaymentMethod[] = ["Cash", "Transfer", "QRIS"];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-950">
        Breakdown metode pembayaran
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[520px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4 font-semibold">Metode</th>
              <th className="py-3 pr-4 text-right font-semibold">
                Transaksi
              </th>
              <th className="py-3 text-right font-semibold">Omzet</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method} className="border-b border-zinc-100 last:border-0">
                <td className="py-3 pr-4 font-semibold text-zinc-950">
                  {method}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                  {formatNumber(breakdown[method].transaction_count)}
                </td>
                <td className="py-3 text-right tabular-nums font-semibold text-zinc-950">
                  {formatCurrency(breakdown[method].total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TransactionItems({ items }: { items: ReportItem[] }) {
  return (
    <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 uppercase text-zinc-500">
              <th className="py-2 pr-3 font-semibold">Produk</th>
              <th className="py-2 pr-3 text-right font-semibold">Qty</th>
              <th className="py-2 pr-3 text-right font-semibold">Harga</th>
              <th className="py-2 pr-3 text-right font-semibold">Modal</th>
              <th className="py-2 pr-3 text-right font-semibold">Subtotal</th>
              <th className="py-2 text-right font-semibold">Profit</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="py-5 text-center text-zinc-500" colSpan={6}>
                  Item transaksi tidak ditemukan.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-200 last:border-0"
                >
                  <td className="py-2 pr-3 text-zinc-700">
                    <span className="font-semibold text-zinc-950">
                      {item.product_code}
                    </span>{" "}
                    {item.product_name}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">
                    {formatNumber(item.qty)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">
                    {formatCurrency(item.unit_cost)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">
                    {formatCurrency(item.line_total)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold text-zinc-950">
                    {formatCurrency(item.estimated_profit)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionsTable({
  transactions,
}: {
  transactions: ReportTransaction[];
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">
          Transaksi penjualan
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Buka detail untuk melihat item transaksi.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4 font-semibold">Tanggal</th>
              <th className="py-3 pr-4 font-semibold">Invoice</th>
              <th className="py-3 pr-4 font-semibold">Kasir</th>
              <th className="py-3 pr-4 font-semibold">Payment</th>
              <th className="py-3 pr-4 text-right font-semibold">Qty</th>
              <th className="py-3 pr-4 text-right font-semibold">Subtotal</th>
              <th className="py-3 pr-4 text-right font-semibold">Diskon</th>
              <th className="py-3 pr-4 text-right font-semibold">Total</th>
              <th className="py-3 text-right font-semibold">Profit</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-zinc-500" colSpan={9}>
                  Tidak ada transaksi pada rentang tanggal ini.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="py-3 pr-4 align-top text-zinc-600">
                    {formatDateTime(transaction.created_at)}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <details>
                      <summary className="cursor-pointer font-semibold text-emerald-700 outline-none focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                        {transaction.invoice_number}
                      </summary>
                      <TransactionItems items={transaction.items} />
                    </details>
                  </td>
                  <td className="py-3 pr-4 align-top text-zinc-600">
                    {transaction.cashier_name}
                  </td>
                  <td className="py-3 pr-4 align-top text-zinc-600">
                    {transaction.payment_method}
                  </td>
                  <td className="py-3 pr-4 align-top text-right tabular-nums text-zinc-700">
                    {formatNumber(transaction.total_qty)}
                  </td>
                  <td className="py-3 pr-4 align-top text-right tabular-nums text-zinc-700">
                    {formatCurrency(transaction.subtotal)}
                  </td>
                  <td className="py-3 pr-4 align-top text-right tabular-nums text-zinc-700">
                    {formatCurrency(transaction.discount)}
                  </td>
                  <td className="py-3 pr-4 align-top text-right tabular-nums font-semibold text-zinc-950">
                    {formatCurrency(transaction.total)}
                  </td>
                  <td className="py-3 align-top text-right tabular-nums font-semibold text-zinc-950">
                    {formatCurrency(transaction.estimated_profit)}
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

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const filters = resolveReportFilters(
    getSearchParamValue(params.start_date),
    getSearchParamValue(params.end_date),
  );
  let reportData;
  let errorMessage: string | null = null;

  try {
    reportData = await getSalesReportData(profile, filters);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi error saat membaca laporan.";
  }

  if (errorMessage || !reportData) {
    return <ReportError message={errorMessage ?? "Laporan kosong."} />;
  }

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">
            Laporan Penjualan
          </h1>
          <p className="mt-2 text-zinc-600">
            Analisis omzet, profit, diskon, dan transaksi per rentang tanggal.
          </p>
        </div>

        <form
          action="/reports"
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Start date
            <input
              type="date"
              name="start_date"
              defaultValue={reportData.filters.startDate}
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            End date
            <input
              type="date"
              name="end_date"
              defaultValue={reportData.filters.endDate}
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 self-end rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          >
            Terapkan
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Total omzet"
          value={formatCurrency(reportData.summary.total_omzet)}
        />
        <MetricCard
          label="Total transaksi"
          value={formatNumber(reportData.summary.total_transactions)}
        />
        <MetricCard
          label="Qty terjual"
          value={formatNumber(reportData.summary.total_qty_sold)}
        />
        <MetricCard
          label="Estimasi profit"
          value={formatCurrency(reportData.summary.estimated_profit)}
        />
        <MetricCard
          label="Total diskon"
          value={formatCurrency(reportData.summary.total_discount)}
        />
      </div>

      <div className="mt-6 grid gap-6">
        <PaymentBreakdownTable breakdown={reportData.paymentBreakdown} />
        <TransactionsTable transactions={reportData.transactions} />
      </div>
    </div>
  );
}
