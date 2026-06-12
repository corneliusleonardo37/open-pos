"use client";

import { useActionState } from "react";

import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "@/app/(app)/products/actions";
import type { Product } from "@/lib/database/products";

const initialState: ProductFormState = {
  error: null,
};

function TextInput({
  label,
  name,
  required = false,
  defaultValue = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
      />
    </label>
  );
}

function NumberInput({
  label,
  name,
  defaultValue = 0,
}: {
  label: string;
  name: string;
  defaultValue?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        defaultValue={defaultValue}
        className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
      />
    </label>
  );
}

export function ProductForm({ product }: { product?: Product | null }) {
  const isEditing = Boolean(product);
  const action = isEditing ? updateProductAction : createProductAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-5">
      {product ? (
        <input type="hidden" name="product_id" value={product.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <TextInput
          label="Kode"
          name="code"
          required
          defaultValue={product?.code}
        />
        <TextInput
          label="Nama"
          name="name"
          required
          defaultValue={product?.name}
        />
        <TextInput
          label="Kategori"
          name="category"
          defaultValue={product?.category}
        />
        <TextInput
          label="Satuan"
          name="unit"
          required
          defaultValue={product?.unit}
        />
        <NumberInput
          label="Stok awal"
          name="initial_stock"
          defaultValue={product?.initial_stock ?? 0}
        />
        {isEditing ? (
          <NumberInput
            label="Stok saat ini"
            name="current_stock"
            defaultValue={product?.current_stock ?? 0}
          />
        ) : null}
        <NumberInput
          label="Harga modal"
          name="cost_price"
          defaultValue={product?.cost_price ?? 0}
        />
        <NumberInput
          label="Harga jual"
          name="selling_price"
          defaultValue={product?.selling_price ?? 0}
        />
        <NumberInput
          label="Stok minimum"
          name="minimum_stock"
          defaultValue={product?.minimum_stock ?? 0}
        />
        {isEditing ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Status
            <select
              name="status"
              defaultValue={product?.status ?? "Aktif"}
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="status" value="Aktif" />
        )}
      </div>

      {!isEditing ? (
        <p className="mt-3 text-sm text-zinc-500">
          Untuk produk baru, stok saat ini otomatis sama dengan stok awal.
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Menyimpan..."
            : isEditing
              ? "Simpan perubahan"
              : "Tambah produk"}
        </button>
        {isEditing ? (
          <a
            href="/products"
            className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Batal edit
          </a>
        ) : null}
      </div>
    </form>
  );
}
