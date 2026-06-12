"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ProductFormState = {
  error: string | null;
};

type ProductPayload = {
  code: string;
  name: string;
  category: string | null;
  unit: string;
  initial_stock: number;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  status: "Aktif" | "Nonaktif";
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

function readNonNegativeNumber(formData: FormData, field: string, label: string) {
  const rawValue = String(formData.get(field) ?? "").trim();
  const value = rawValue === "" ? 0 : Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} tidak boleh negatif.`);
  }

  return value;
}

function readProductPayload(formData: FormData, mode: "create" | "update") {
  const initialStock = readNonNegativeNumber(
    formData,
    "initial_stock",
    "Stok awal",
  );
  const currentStock =
    mode === "create"
      ? initialStock
      : readNonNegativeNumber(formData, "current_stock", "Stok saat ini");
  const status = String(formData.get("status") ?? "Aktif");

  if (status !== "Aktif" && status !== "Nonaktif") {
    throw new Error("Status produk tidak valid.");
  }

  return {
    code: readRequiredText(formData, "code", "Kode produk"),
    name: readRequiredText(formData, "name", "Nama produk"),
    category: readOptionalText(formData, "category"),
    unit: readRequiredText(formData, "unit", "Satuan"),
    initial_stock: initialStock,
    current_stock: currentStock,
    cost_price: readNonNegativeNumber(formData, "cost_price", "Harga modal"),
    selling_price: readNonNegativeNumber(
      formData,
      "selling_price",
      "Harga jual",
    ),
    minimum_stock: readNonNegativeNumber(
      formData,
      "minimum_stock",
      "Stok minimum",
    ),
    status: status as ProductPayload["status"],
  };
}

function getProductId(formData: FormData) {
  return String(formData.get("product_id") ?? "").trim();
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const profile = await requireOwnerProfile();

  try {
    const payload = readProductPayload(formData, "create");
    const { error } = await supabaseAdmin.from("products").insert({
      ...payload,
      organization_id: profile.organization_id,
      status: "Aktif",
    });

    if (error) {
      return { error: `Gagal menambah produk: ${error.message}` };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Data produk tidak valid.",
    };
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const profile = await requireOwnerProfile();

  try {
    const productId = getProductId(formData);

    if (!productId) {
      throw new Error("Produk tidak ditemukan.");
    }

    const payload = readProductPayload(formData, "update");
    const { error } = await supabaseAdmin
      .from("products")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { error: `Gagal mengubah produk: ${error.message}` };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Data produk tidak valid.",
    };
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function deactivateProductAction(formData: FormData) {
  const profile = await requireOwnerProfile();
  const productId = getProductId(formData);

  if (!productId) {
    redirect("/products");
  }

  await supabaseAdmin
    .from("products")
    .update({
      status: "Nonaktif",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/products");
  redirect("/products");
}
