import { redirect } from "next/navigation";

import {
  type DashboardData,
  type DashboardSale,
  type LowStockProduct,
  getDashboardData,
} from "@/lib/database/dashboard";
import { getCurrentUserProfile } from "@/lib/database/profiles";

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

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-950">
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm text-zinc-500">{helper}</p> : null}
    </section>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-semibold text-zinc-950">Dashboard</h1>
      <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">
          Dashboard belum bisa dimuat
        </h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </section>
    </div>
  );
}

function LatestTransactionsTable({
  transactions,
  showCashier,
}: {
  transactions: DashboardSale[];
  showCashier: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">
          5 transaksi terbaru
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Transaksi terakhir yang tercatat di organization ini.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4 font-semibold">Invoice</th>
              <th className="py-3 pr-4 font-semibold">Waktu</th>
              {showCashier ? (
                <th className="py-3 pr-4 font-semibold">Kasir</th>
              ) : null}
              <th className="py-3 pr-4 font-semibold">Payment</th>
              <th className="py-3 pr-4 text-right font-semibold">Qty</th>
              <th className="py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td
                  className="py-8 text-center text-zinc-500"
                  colSpan={showCashier ? 6 : 5}
                >
                  Belum ada transaksi.
                </td>
              </tr>
            ) : (
              transactions.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="py-3 pr-4 font-semibold text-zinc-950">
                    {sale.invoice_number}
                  </td>
                  <td className="py-3 pr-4 text-zinc-600">
                    {formatDateTime(sale.created_at)}
                  </td>
                  {showCashier ? (
                    <td className="py-3 pr-4 text-zinc-600">
                      {sale.cashier_name}
                    </td>
                  ) : null}
                  <td className="py-3 pr-4 text-zinc-600">
                    {sale.payment_method}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                    {formatNumber(sale.total_qty)}
                  </td>
                  <td className="py-3 text-right tabular-nums font-semibold text-zinc-950">
                    {formatCurrency(sale.total)}
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

function LowStockTable({ products }: { products: LowStockProduct[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">
          Produk stok rendah
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Produk aktif dengan stok saat ini di bawah atau sama dengan minimum.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[640px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4 font-semibold">Kode</th>
              <th className="py-3 pr-4 font-semibold">Nama</th>
              <th className="py-3 pr-4 text-right font-semibold">
                Stok saat ini
              </th>
              <th className="py-3 pr-4 text-right font-semibold">Minimum</th>
              <th className="py-3 text-right font-semibold">Unit</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-zinc-500" colSpan={5}>
                  Tidak ada produk stok rendah.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="py-3 pr-4 font-semibold text-zinc-950">
                    {product.code}
                  </td>
                  <td className="py-3 pr-4 text-zinc-700">{product.name}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                    {formatNumber(product.current_stock)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                    {formatNumber(product.minimum_stock)}
                  </td>
                  <td className="py-3 text-right text-zinc-600">
                    {product.unit ?? "-"}
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

function DashboardContent({
  data,
  role,
}: {
  data: DashboardData;
  role: "Owner" | "Kasir";
}) {
  const isOwner = role === "Owner";

  return (
    <div className="max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Ringkasan operasional hari ini, {data.todayRange.label}.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Penjualan hari ini"
          value={formatCurrency(data.todaySalesTotal)}
          helper={isOwner ? "Semua kasir" : "Transaksi milik Anda"}
        />
        <MetricCard
          label="Transaksi hari ini"
          value={formatNumber(data.todayTransactionCount)}
          helper={isOwner ? "Semua kasir" : "Transaksi milik Anda"}
        />
        {data.ownerMetrics ? (
          <>
            <MetricCard
              label="Estimasi profit hari ini"
              value={formatCurrency(data.ownerMetrics.todayEstimatedProfit)}
              helper="Dari sale items"
            />
            <MetricCard
              label="Produk aktif"
              value={formatNumber(data.ownerMetrics.activeProductCount)}
              helper={`${formatNumber(
                data.ownerMetrics.totalAvailableStock,
              )} total stok tersedia`}
            />
          </>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6">
        <LatestTransactionsTable
          transactions={data.latestTransactions}
          showCashier={isOwner}
        />
        {data.ownerMetrics ? (
          <LowStockTable products={data.ownerMetrics.lowStockProducts} />
        ) : null}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  let data: DashboardData | null = null;
  let errorMessage: string | null = null;

  try {
    data = await getDashboardData(profile);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi error saat membaca data dashboard.";
  }

  if (errorMessage || !data) {
    return <DashboardError message={errorMessage ?? "Dashboard kosong."} />;
  }

  return <DashboardContent data={data} role={profile.role} />;
}
