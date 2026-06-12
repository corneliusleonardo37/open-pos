"use client";

import { useActionState } from "react";

import {
  createStockInAction,
  type StockInFormState,
} from "@/app/(app)/stock-in/actions";
import { NumberInput } from "@/components/number-input";
import type { ActiveProductOption } from "@/lib/database/stock-ins";

const initialState: StockInFormState = {
  error: null,
};

export function StockInForm({
  products,
}: {
  products: ActiveProductOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createStockInAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 md:col-span-2">
          Produk
          <select
            name="product_id"
            required
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            defaultValue=""
          >
            <option value="" disabled>
              Pilih produk aktif
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.code} - {product.name} ({product.unit}, stok{" "}
                {product.current_stock})
              </option>
            ))}
          </select>
        </label>

        <NumberInput label="Qty masuk" name="qty" required />
        <NumberInput
          label="Harga modal baru"
          name="unit_cost"
          formatThousands
        />

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Supplier
          <input
            name="supplier"
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Catatan
          <input
            name="note"
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          />
        </label>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || products.length === 0}
        className="mt-5 min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan barang masuk"}
      </button>
    </form>
  );
}
