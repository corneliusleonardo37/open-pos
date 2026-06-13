import { redirect } from "next/navigation";

import { StockInForm } from "@/app/(app)/stock-in/stock-in-form";
import { getCurrentUserProfile } from "@/lib/database/profiles";
import {
  getActiveProductOptions,
  getRecentStockIns,
} from "@/lib/database/stock-ins";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function StockInError({ message }: { message: string }) {
  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-zinc-950">Barang masuk</h1>
      <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">
          Barang masuk belum bisa dimuat
        </h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </section>
    </div>
  );
}

export default async function StockInPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  let products: Awaited<ReturnType<typeof getActiveProductOptions>> = [];
  let history: Awaited<ReturnType<typeof getRecentStockIns>> = [];
  let errorMessage: string | null = null;

  try {
    [products, history] = await Promise.all([
      getActiveProductOptions(profile.organization_id),
      getRecentStockIns(profile.organization_id),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi error saat membaca barang masuk.";
  }

  if (errorMessage) {
    return <StockInError message={errorMessage} />;
  }

  return (
    <div className="max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Barang masuk</h1>
        <p className="mt-2 text-zinc-600">
          Catat stok masuk, update stok produk, dan simpan jejak audit.
        </p>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-950">
          Input barang masuk
        </h2>
        {products.length === 0 ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Belum ada produk aktif untuk organization ini.
          </p>
        ) : null}
        <StockInForm products={products} />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">
            Riwayat terbaru
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Menampilkan maksimal 20 transaksi barang masuk terakhir.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-3 pr-4 font-semibold">Tanggal</th>
                <th className="py-3 pr-4 font-semibold">Kode</th>
                <th className="py-3 pr-4 font-semibold">Produk</th>
                <th className="py-3 pr-4 text-right font-semibold">Qty</th>
                <th className="py-3 pr-4 text-right font-semibold">
                  Unit cost
                </th>
                <th className="py-3 pr-4 font-semibold">Supplier</th>
                <th className="py-3 font-semibold">Created by</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-zinc-500" colSpan={7}>
                    Belum ada riwayat barang masuk.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="py-3 pr-4 text-zinc-700">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-zinc-950">
                      {item.product_code}
                    </td>
                    <td className="py-3 pr-4 text-zinc-800">
                      {item.product_name}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatNumber(item.qty)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-700">
                      {item.supplier || "-"}
                    </td>
                    <td className="py-3 text-zinc-700">
                      {item.created_by_name || "-"}
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
