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

type SaleItemSnapshot = {
  product_id: string;
  code: string;
  name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
  estimated_profit: number;
  previous_stock: number;
  next_stock: number;
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
    const productIds = Array.from(new Set(cart.map((item) => item.product_id)));

    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, code, name, current_stock, cost_price, selling_price")
      .eq("organization_id", profile.organization_id)
      .eq("status", "Aktif")
      .in("id", productIds);

    if (productError) {
      return { error: `Gagal membaca produk: ${productError.message}`, receipt: null };
    }

    const productMap = new Map(
      (products ?? []).map((product) => [product.id as string, product]),
    );

    const itemSnapshots: SaleItemSnapshot[] = cart.map((item) => {
      const product = productMap.get(item.product_id);

      if (!product) {
        throw new Error("Produk aktif di cart tidak ditemukan.");
      }

      const currentStock = Number(product.current_stock ?? 0);
      const unitPrice = Number(product.selling_price ?? 0);
      const unitCost = Number(product.cost_price ?? 0);

      if (item.qty > currentStock) {
        throw new Error(
          `Stok ${product.code} - ${product.name} tidak cukup. Stok tersedia ${currentStock}.`,
        );
      }

      const lineTotal = item.qty * unitPrice;

      return {
        product_id: item.product_id,
        code: String(product.code),
        name: String(product.name),
        qty: item.qty,
        unit_price: unitPrice,
        unit_cost: unitCost,
        line_total: lineTotal,
        estimated_profit: (unitPrice - unitCost) * item.qty,
        previous_stock: currentStock,
        next_stock: currentStock - item.qty,
      };
    });

    const subtotal = itemSnapshots.reduce(
      (total, item) => total + item.line_total,
      0,
    );
    const discount = Math.min(discountInput, subtotal);
    const total = Math.max(subtotal - discount, 0);
    const paidAmount =
      paymentMethod === "Cash"
        ? paidAmountInput
        : paidAmountInput > 0
          ? paidAmountInput
          : total;

    if (paidAmount < total) {
      throw new Error("Nominal dibayar tidak boleh kurang dari total.");
    }

    const changeAmount = paymentMethod === "Cash" ? paidAmount - total : 0;
    const totalQty = itemSnapshots.reduce((sum, item) => sum + item.qty, 0);
    const now = new Date();
    const invoiceNumber = createInvoiceNumber(now);
    const updatedProducts: SaleItemSnapshot[] = [];
    let saleId: string | null = null;

    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .insert({
        organization_id: profile.organization_id,
        branch_id: profile.branch_id,
        invoice_number: invoiceNumber,
        total_qty: totalQty,
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (saleError || !sale) {
      return {
        error: `Gagal menyimpan transaksi: ${
          saleError?.message ?? "data sale tidak kembali"
        }`,
        receipt: null,
      };
    }

    saleId = sale.id as string;

    const { error: saleItemsError } = await supabaseAdmin
      .from("sale_items")
      .insert(
        itemSnapshots.map((item) => ({
          organization_id: profile.organization_id,
          branch_id: profile.branch_id,
          sale_id: saleId,
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.line_total,
          unit_cost: item.unit_cost,
          estimated_profit: item.estimated_profit,
        })),
      );

    if (saleItemsError) {
      await supabaseAdmin.from("sales").delete().eq("id", saleId);

      return {
        error: `Gagal menyimpan item transaksi: ${saleItemsError.message}`,
        receipt: null,
      };
    }

    for (const item of itemSnapshots) {
      const { data: updatedProduct, error: stockError } = await supabaseAdmin
        .from("products")
        .update({
          current_stock: item.next_stock,
          updated_at: now.toISOString(),
        })
        .eq("id", item.product_id)
        .eq("organization_id", profile.organization_id)
        .eq("current_stock", item.previous_stock)
        .select("id")
        .maybeSingle();

      if (stockError || !updatedProduct) {
        for (const updatedItem of updatedProducts) {
          await supabaseAdmin
            .from("products")
            .update({
              current_stock: updatedItem.previous_stock,
              updated_at: now.toISOString(),
            })
            .eq("id", updatedItem.product_id)
            .eq("organization_id", profile.organization_id);
        }

        await supabaseAdmin.from("sales").delete().eq("id", saleId);

        return {
          error:
            stockError?.message ??
            "Stok berubah saat transaksi diproses. Transaksi dibatalkan, silakan muat ulang.",
          receipt: null,
        };
      }

      updatedProducts.push(item);
    }

    await supabaseAdmin.from("audit_logs").insert({
      organization_id: profile.organization_id,
      branch_id: profile.branch_id,
      actor_profile_id: profile.id,
      action: "sale_created",
      entity_type: "sales",
      entity_id: saleId,
      metadata: {
        invoice_number: invoiceNumber,
        total_qty: totalQty,
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        items: itemSnapshots.map((item) => ({
          product_id: item.product_id,
          code: item.code,
          name: item.name,
          qty: item.qty,
          previous_stock: item.previous_stock,
          next_stock: item.next_stock,
        })),
      },
    });

    revalidatePath("/sales");
    revalidatePath("/products");

    return {
      error: null,
      receipt: {
        invoice_number: invoiceNumber,
        created_at: now.toISOString(),
        payment_method: paymentMethod,
        subtotal,
        discount,
        total,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        items: itemSnapshots.map((item) => ({
          code: item.code,
          name: item.name,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.line_total,
        })),
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
