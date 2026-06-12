import Link from "next/link";
import { redirect } from "next/navigation";

import { deactivateProductAction } from "@/app/(app)/products/actions";
import { ProductForm } from "@/app/(app)/products/product-form";
import {
  getProductByIdForOrganization,
  getProductsByOrganization,
} from "@/lib/database/products";
import { getCurrentUserProfile } from "@/lib/database/profiles";

type ProductsPageProps = {
  searchParams: Promise<{
    search?: string | string[];
    edit?: string | string[];
  }>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
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

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = getSearchParamValue(params.search).trim();
  const editProductId = getSearchParamValue(params.edit).trim();
  const [products, editingProduct] = await Promise.all([
    getProductsByOrganization(profile.organization_id, search),
    editProductId
      ? getProductByIdForOrganization(editProductId, profile.organization_id)
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Produk</h1>
          <p className="mt-2 text-zinc-600">
            Kelola daftar barang, harga, dan status produk per organization.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-950">
          {editingProduct ? "Edit produk" : "Tambah produk"}
        </h2>
        <ProductForm product={editingProduct} />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Daftar barang
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {products.length} produk ditemukan
            </p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" action="/products">
            <label className="sr-only" htmlFor="product-search">
              Cari produk
            </label>
            <input
              id="product-search"
              name="search"
              defaultValue={search}
              placeholder="Cari kode atau nama"
              className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 sm:w-72"
            />
            <button
              type="submit"
              className="min-h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
            >
              Search
            </button>
            {search ? (
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Reset
              </Link>
            ) : null}
          </form>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-3 pr-4 font-semibold">Kode</th>
                <th className="py-3 pr-4 font-semibold">Nama</th>
                <th className="py-3 pr-4 font-semibold">Kategori</th>
                <th className="py-3 pr-4 font-semibold">Unit</th>
                <th className="py-3 pr-4 text-right font-semibold">
                  Stok awal
                </th>
                <th className="py-3 pr-4 text-right font-semibold">
                  Stok saat ini
                </th>
                <th className="py-3 pr-4 text-right font-semibold">
                  Minimum
                </th>
                <th className="py-3 pr-4 text-right font-semibold">Modal</th>
                <th className="py-3 pr-4 text-right font-semibold">Jual</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-zinc-500" colSpan={11}>
                    Belum ada produk yang cocok.
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
                    <td className="py-3 pr-4 text-zinc-800">{product.name}</td>
                    <td className="py-3 pr-4 text-zinc-600">
                      {product.category || "-"}
                    </td>
                    <td className="py-3 pr-4 text-zinc-600">{product.unit}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatNumber(product.initial_stock)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatNumber(product.current_stock)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatNumber(product.minimum_stock)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatCurrency(product.cost_price)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                      {formatCurrency(product.selling_price)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                          product.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600",
                        ].join(" ")}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/products?edit=${product.id}`}
                          className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        >
                          Edit
                        </Link>
                        {product.status === "Aktif" ? (
                          <form action={deactivateProductAction}>
                            <input
                              type="hidden"
                              name="product_id"
                              value={product.id}
                            />
                            <button
                              type="submit"
                              className="min-h-10 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                              Nonaktifkan
                            </button>
                          </form>
                        ) : null}
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
