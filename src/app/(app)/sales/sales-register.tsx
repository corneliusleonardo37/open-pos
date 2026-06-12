"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createSaleAction,
  type SaleFormState,
  type SaleReceipt,
} from "@/app/(app)/sales/actions";
import {
  formatNumberInput,
  normalizeNumberInput,
  parseNumberInput,
} from "@/components/number-input";
import type { SaleProductOption } from "@/lib/database/sales";

type CartItem = {
  product: SaleProductOption;
  qty: number;
};

const initialState: SaleFormState = {
  error: null,
  receipt: null,
};

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

function normalizeQtyInput(value: string) {
  const integerPart = value.split(/[.,]/)[0] ?? "";
  const digitsOnly = integerPart.replace(/\D/g, "");

  return digitsOnly.replace(/^0+(?=\d)/, "");
}

function clampQty(value: number, currentStock: number) {
  const stockLimit = Math.max(Math.floor(currentStock), 1);

  return Math.min(Math.max(Math.trunc(value), 1), stockLimit);
}

function removeQtyInput(
  currentInputs: Record<string, string>,
  productId: string,
) {
  const nextInputs = { ...currentInputs };

  delete nextInputs[productId];

  return nextInputs;
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const displayValue = value ? formatNumberInput(value) : "";

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        inputMode="decimal"
        value={displayValue}
        onBlur={() => onChange(normalizeNumberInput(value))}
        onChange={(event) => onChange(parseNumberInput(event.target.value))}
        onFocus={() => {
          if (Number(value || "0") === 0) {
            onChange("");
          }
        }}
        className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
      />
    </label>
  );
}

function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: SaleReceipt;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <section className="max-h-full w-full max-w-md overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Open POS</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">
              Struk transaksi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Tutup
          </button>
        </div>

        <div className="mt-5 space-y-1 border-b border-zinc-200 pb-4 text-sm text-zinc-600">
          <p>
            Invoice:{" "}
            <span className="font-semibold text-zinc-950">
              {receipt.invoice_number}
            </span>
          </p>
          <p>
            Waktu: {new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(receipt.created_at))}
          </p>
          <p>Payment: {receipt.payment_method}</p>
        </div>

        <div className="mt-4 space-y-3">
          {receipt.items.map((item) => (
            <div key={`${item.code}-${item.name}`} className="text-sm">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-zinc-950">{item.name}</p>
                <p className="font-semibold text-zinc-950">
                  {formatCurrency(item.line_total)}
                </p>
              </div>
              <p className="mt-1 text-zinc-500">
                {item.code} | {formatNumber(item.qty)} x{" "}
                {formatCurrency(item.unit_price)}
              </p>
            </div>
          ))}
        </div>

        <dl className="mt-5 space-y-2 border-t border-zinc-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd className="font-medium text-zinc-950">
              {formatCurrency(receipt.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">Diskon</dt>
            <dd className="font-medium text-zinc-950">
              {formatCurrency(receipt.discount)}
            </dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold text-zinc-950">Total</dt>
            <dd className="font-semibold text-zinc-950">
              {formatCurrency(receipt.total)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">Dibayar</dt>
            <dd className="font-medium text-zinc-950">
              {formatCurrency(receipt.paid_amount)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">Kembalian</dt>
            <dd className="font-medium text-zinc-950">
              {formatCurrency(receipt.change_amount)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export function SalesRegister({ products }: { products: SaleProductOption[] }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [state, formAction, isPending] = useActionState(
    async (previousState: SaleFormState, formData: FormData) => {
      const result = await createSaleAction(previousState, formData);

      if (result.receipt) {
        setReceipt(result.receipt);
        setCart([]);
        setDiscount("0");
        setPaidAmount("0");
        setPaymentMethod("Cash");
        setQtyInputs({});
      }

      return result;
    },
    initialState,
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.code.toLowerCase().includes(normalizedSearch) ||
        product.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, search]);

  const subtotal = cart.reduce(
    (total, item) => total + item.qty * item.product.selling_price,
    0,
  );
  const discountValue = Math.min(Number(discount || "0"), subtotal);
  const total = Math.max(subtotal - discountValue, 0);
  const paidValue =
    paymentMethod === "Cash"
      ? Number(paidAmount || "0")
      : Number(paidAmount || "0") > 0
        ? Number(paidAmount || "0")
        : total;
  const changeAmount =
    paymentMethod === "Cash" ? Math.max(paidValue - total, 0) : 0;
  const cartJson = JSON.stringify(
    cart.map((item) => ({
      product_id: item.product.id,
      qty: item.qty,
    })),
  );

  function addToCart(product: SaleProductOption) {
    if (product.current_stock <= 0) {
      return;
    }

    setQtyInputs((currentInputs) => removeQtyInput(currentInputs, product.id));

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                qty: Math.min(item.qty + 1, item.product.current_stock),
              }
            : item,
        );
      }

      return [...currentCart, { product, qty: 1 }];
    });
  }

  function updateQty(productId: string, value: string, currentStock: number) {
    const normalizedValue = normalizeQtyInput(value);

    if (!normalizedValue) {
      setQtyInputs((currentInputs) => ({
        ...currentInputs,
        [productId]: "",
      }));

      return;
    }

    const qty = Number(normalizedValue);

    if (!Number.isFinite(qty) || qty <= 0) {
      setQtyInputs((currentInputs) => ({
        ...currentInputs,
        [productId]: normalizedValue,
      }));

      return;
    }

    const nextQty = clampQty(qty, currentStock);

    setQtyInputs((currentInputs) => ({
      ...currentInputs,
      [productId]: String(nextQty),
    }));

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              qty: nextQty,
            }
          : item,
      ),
    );
  }

  function commitQty(item: CartItem) {
    const rawValue = qtyInputs[item.product.id] ?? String(item.qty);
    const qty = Number(rawValue);
    const nextQty =
      Number.isFinite(qty) && qty > 0
        ? clampQty(qty, item.product.current_stock)
        : 1;

    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.product.id === item.product.id
          ? {
              ...cartItem,
              qty: nextQty,
            }
          : cartItem,
      ),
    );
    setQtyInputs((currentInputs) => {
      return removeQtyInput(currentInputs, item.product.id);
    });
  }

  function focusQty(item: CartItem) {
    const displayValue = qtyInputs[item.product.id] ?? String(item.qty);

    if (Number(displayValue || "0") === 1) {
      setQtyInputs((currentInputs) => ({
        ...currentInputs,
        [item.product.id]: "",
      }));
    }
  }

  function removeItem(productId: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId),
    );
    setQtyInputs((currentInputs) => removeQtyInput(currentInputs, productId));
  }

  return (
    <>
      {receipt ? (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="cart_json" value={cartJson} />
        <input type="hidden" name="discount" value={discount || "0"} />
        <input type="hidden" name="paid_amount" value={paidAmount || "0"} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Pilih produk
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Cari kode atau nama produk aktif, lalu tambahkan ke cart.
              </p>
            </div>

            <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Search produk
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari kode atau nama"
                className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              />
            </label>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredProducts.length === 0 ? (
                <p className="rounded-md border border-zinc-200 px-3 py-4 text-sm text-zinc-500 md:col-span-2">
                  Produk aktif tidak ditemukan.
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.current_stock <= 0}
                    className="min-h-24 rounded-md border border-zinc-200 p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-zinc-950">
                        {product.code}
                      </p>
                      <p className="text-sm font-semibold text-zinc-950">
                        {formatCurrency(product.selling_price)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">
                      {product.name}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Stok {formatNumber(product.current_stock)} {product.unit}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-base font-semibold text-zinc-950">Cart</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[680px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                      <th className="py-3 pr-4 font-semibold">Produk</th>
                      <th className="py-3 pr-4 text-right font-semibold">
                        Harga
                      </th>
                      <th className="py-3 pr-4 text-right font-semibold">
                        Qty
                      </th>
                      <th className="py-3 pr-4 text-right font-semibold">
                        Subtotal
                      </th>
                      <th className="py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr>
                        <td
                          className="py-8 text-center text-zinc-500"
                          colSpan={5}
                        >
                          Cart masih kosong.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr
                          key={item.product.id}
                          className="border-b border-zinc-100 last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-zinc-950">
                              {item.product.code}
                            </p>
                            <p className="mt-1 text-zinc-600">
                              {item.product.name}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                            {formatCurrency(item.product.selling_price)}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={
                                qtyInputs[item.product.id] ?? String(item.qty)
                              }
                              onChange={(event) =>
                                updateQty(
                                  item.product.id,
                                  event.target.value,
                                  item.product.current_stock,
                                )
                              }
                              onFocus={() => focusQty(item)}
                              onBlur={() => commitQty(item)}
                              aria-label={`Qty ${item.product.name}`}
                              className="min-h-10 w-24 rounded-md border border-zinc-300 px-2 text-right text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                            />
                            <p className="mt-1 text-xs text-zinc-500">
                              Max {formatNumber(item.product.current_stock)}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums font-semibold text-zinc-950">
                            {formatCurrency(
                              item.qty * item.product.selling_price,
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(item.product.id)}
                              className="min-h-10 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-zinc-200 bg-white p-5 xl:sticky xl:top-4 xl:self-start">
            <h2 className="text-base font-semibold text-zinc-950">
              Pembayaran
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Subtotal</dt>
                <dd className="font-semibold text-zinc-950">
                  {formatCurrency(subtotal)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-4">
              <MoneyInput
                label="Discount"
                value={discount}
                onChange={setDiscount}
              />
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                Payment method
                <select
                  name="payment_method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                >
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Transfer</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </label>
              <MoneyInput
                label="Paid amount"
                value={paidAmount}
                onChange={setPaidAmount}
              />
            </div>

            <dl className="mt-5 space-y-3 border-t border-zinc-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Diskon dipakai</dt>
                <dd className="font-semibold text-zinc-950">
                  {formatCurrency(discountValue)}
                </dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="font-semibold text-zinc-950">Total</dt>
                <dd className="font-semibold text-zinc-950">
                  {formatCurrency(total)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Dibayar</dt>
                <dd className="font-semibold text-zinc-950">
                  {formatCurrency(paidValue)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Kembalian</dt>
                <dd className="font-semibold text-zinc-950">
                  {formatCurrency(changeAmount)}
                </dd>
              </div>
            </dl>

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
              disabled={isPending || cart.length === 0}
              className="mt-5 min-h-12 w-full rounded-md bg-emerald-700 px-4 text-base font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Memproses..." : "Submit transaksi"}
            </button>
          </aside>
        </div>
      </form>
    </>
  );
}
