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

    const { data: stockIn, error: stockInError } = await supabaseAdmin
      .rpc("process_stock_in", {
        p_organization_id: profile.organization_id,
        p_branch_id: profile.branch_id,
        p_created_by: profile.id,
        p_product_id: productId,
        p_qty: qty,
        p_unit_cost: unitCost,
        p_supplier: supplier,
        p_note: note,
      })
      .single();

    if (stockInError || !stockIn) {
      return {
        error: `Gagal memproses barang masuk: ${
          stockInError?.message ?? "data stock_in tidak kembali dari RPC"
        }`,
      };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Data barang masuk tidak valid.",
    };
  }

  revalidatePath("/stock-in");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/audit-log");
  redirect("/stock-in");
}
