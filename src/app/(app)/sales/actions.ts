"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaymentMethod = "Cash" | "Transfer" | "QRIS";

type CartPayloadItem = {
  product_id: string;
  qty: number;
};

export type SaleReceipt = {
  invoice_number: string;
  created_at: string;
  payment_method: PaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  items: Array<{
    code: string;
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
};

export type SaleFormState = {
  error: string | null;
  receipt: SaleReceipt | null;
};

type SubmitSaleRpcItem = {
  code?: unknown;
  name?: unknown;
  qty?: unknown;
  unit_price?: unknown;
  line_total?: unknown;
};

type SubmitSaleRpcResult = {
  sale_id: string;
  invoice_number: string;
  total: number | string;
  paid_amount: number | string;
  change_amount: number | string;
  created_at: string;
  payment_method: PaymentMethod;
  subtotal: number | string;
  discount: number | string;
  total_qty: number | string;
  items: SubmitSaleRpcItem[] | null;
};

async function requireSalesProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner" && profile.role !== "Kasir") {
    redirect("/dashboard");
  }

  return profile;
}

function readNumber(formData: FormData, field: string, label: string) {
  const rawValue = String(formData.get(field) ?? "").trim();
  const value = rawValue === "" ? 0 : Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} tidak boleh negatif.`);
  }

  return value;
}

function toNumber(value: number | string | null | undefined) {
  const parsedValue = Number(value ?? 0);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function readReceiptItems(items: SubmitSaleRpcResult["items"]) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
    qty: toNumber(item.qty as number | string | null | undefined),
    unit_price: toNumber(item.unit_price as number | string | null | undefined),
    line_total: toNumber(item.line_total as number | string | null | undefined),
  }));
}

function readPaymentMethod(formData: FormData): PaymentMethod {
  const paymentMethod = String(formData.get("payment_method") ?? "");

  if (
    paymentMethod !== "Cash" &&
    paymentMethod !== "Transfer" &&
    paymentMethod !== "QRIS"
  ) {
    throw new Error("Metode pembayaran tidak valid.");
  }

  return paymentMethod;
}

function readCart(formData: FormData) {
  const rawCart = String(formData.get("cart_json") ?? "[]");
  const parsedCart = JSON.parse(rawCart) as CartPayloadItem[];

  if (!Array.isArray(parsedCart) || parsedCart.length === 0) {
    throw new Error("Cart masih kosong.");
  }

  const cartByProduct = new Map<string, number>();

  parsedCart.forEach((item) => {
    const productId = String(item.product_id ?? "").trim();
    const qty = Number(item.qty);

    if (!productId) {
      throw new Error("Produk di cart tidak valid.");
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("Qty item harus lebih dari 0.");
    }

    if (!Number.isInteger(qty)) {
      throw new Error("Qty item harus angka bulat.");
    }

    cartByProduct.set(productId, (cartByProduct.get(productId) ?? 0) + qty);
  });

  return Array.from(cartByProduct.entries()).map(([productId, qty]) => {
    return {
      product_id: productId,
      qty,
    };
  });
}

function createInvoiceNumber(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `POS-${getPart("year")}${getPart("month")}${getPart("day")}-${getPart(
    "hour",
  )}${getPart("minute")}${getPart("second")}`;
}

export async function createSaleAction(
  _previousState: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const profile = await requireSalesProfile();

  try {
    if (!profile.branch_id) {
      throw new Error("Profile belum terhubung ke branch.");
    }

    const cart = readCart(formData);
    const discountInput = readNumber(formData, "discount", "Diskon");
    const paidAmountInput = readNumber(formData, "paid_amount", "Dibayar");
    const paymentMethod = readPaymentMethod(formData);
    const now = new Date();
    const invoiceNumber = createInvoiceNumber(now);

    const { data: sale, error: saleError } = await supabaseAdmin
      .rpc("submit_sale", {
        p_organization_id: profile.organization_id,
        p_branch_id: profile.branch_id,
        p_created_by: profile.id,
        p_invoice_number: invoiceNumber,
        p_payment_method: paymentMethod,
        p_discount: discountInput,
        p_paid_amount: paidAmountInput,
        p_items: cart,
      })
      .single();

    if (saleError || !sale) {
      return {
        error: `Gagal memproses transaksi: ${
          saleError?.message ?? "data sale tidak kembali dari RPC"
        }`,
        receipt: null,
      };
    }

    const submittedSale = sale as SubmitSaleRpcResult;

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/audit-log");

    return {
      error: null,
      receipt: {
        invoice_number: submittedSale.invoice_number,
        created_at: submittedSale.created_at ?? now.toISOString(),
        payment_method: submittedSale.payment_method,
        subtotal: toNumber(submittedSale.subtotal),
        discount: toNumber(submittedSale.discount),
        total: toNumber(submittedSale.total),
        paid_amount: toNumber(submittedSale.paid_amount),
        change_amount: toNumber(submittedSale.change_amount),
        items: readReceiptItems(submittedSale.items),
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Transaksi tidak dapat diproses.",
      receipt: null,
    };
  }
}
