"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type StockInFormState = {
  error: string | null;
};

async function requireOwnerProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner") {
    redirect("/dashboard");
  }

  return profile;
}

function readRequiredText(formData: FormData, field: string, label: string) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new Error(`${label} wajib diisi.`);
  }

  return value;
}

function readOptionalText(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").trim();

  return value || null;
}

function readNumber(formData: FormData, field: string, label: string) {
  const rawValue = String(formData.get(field) ?? "").trim();
  const value = rawValue === "" ? 0 : Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`${label} harus berupa angka.`);
  }

  return value;
}

export async function createStockInAction(
  _previousState: StockInFormState,
  formData: FormData,
): Promise<StockInFormState> {
  const profile = await requireOwnerProfile();

  try {
    if (!profile.branch_id) {
      throw new Error("Profile Owner belum terhubung ke branch.");
    }

    const productId = readRequiredText(formData, "product_id", "Produk");
    const qty = readNumber(formData, "qty", "Qty masuk");
    const unitCost = readNumber(formData, "unit_cost", "Harga modal baru");
    const supplier = readOptionalText(formData, "supplier");
    const note = readOptionalText(formData, "note");

    if (qty <= 0) {
      throw new Error("Qty masuk harus lebih dari 0.");
    }

    if (unitCost < 0) {
      throw new Error("Harga modal baru tidak boleh negatif.");
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, code, name, current_stock")
      .eq("id", productId)
      .eq("organization_id", profile.organization_id)
      .eq("status", "Aktif")
      .maybeSingle();

    if (productError) {
      return { error: `Gagal membaca produk: ${productError.message}` };
    }

    if (!product) {
      throw new Error("Produk aktif tidak ditemukan.");
    }

    const previousStock = Number(product.current_stock ?? 0);
    const nextStock = previousStock + qty;
    const now = new Date().toISOString();

    const { data: stockIn, error: stockInError } = await supabaseAdmin
      .from("stock_ins")
      .insert({
        organization_id: profile.organization_id,
        branch_id: profile.branch_id,
        product_id: productId,
        qty,
        unit_cost: unitCost,
        supplier,
        note,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (stockInError || !stockIn) {
      return {
        error: `Gagal menyimpan barang masuk: ${
          stockInError?.message ?? "data stock_in tidak kembali"
        }`,
      };
    }

    const productUpdate: {
      current_stock: number;
      cost_price?: number;
      updated_at: string;
    } = {
      current_stock: nextStock,
      updated_at: now,
    };

    if (unitCost > 0) {
      productUpdate.cost_price = unitCost;
    }

    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from("products")
      .update(productUpdate)
      .eq("id", productId)
      .eq("organization_id", profile.organization_id)
      .eq("current_stock", previousStock)
      .select("id")
      .maybeSingle();

    if (updateError) {
      return {
        error: `Barang masuk tercatat, tetapi stok produk gagal diupdate: ${updateError.message}`,
      };
    }

    if (!updatedProduct) {
      return {
        error:
          "Barang masuk tercatat, tetapi stok produk berubah oleh proses lain. Muat ulang halaman lalu cek stok produk.",
      };
    }

    await supabaseAdmin.from("audit_logs").insert({
      organization_id: profile.organization_id,
      branch_id: profile.branch_id,
      actor_profile_id: profile.id,
      action: "stock_in_created",
      entity_type: "stock_ins",
      entity_id: stockIn.id,
      metadata: {
        product_id: productId,
        product_code: product.code,
        product_name: product.name,
        qty,
        previous_stock: previousStock,
        next_stock: nextStock,
        unit_cost: unitCost,
        supplier,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Data barang masuk tidak valid.",
    };
  }

  revalidatePath("/stock-in");
  revalidatePath("/products");
  redirect("/stock-in");
}
