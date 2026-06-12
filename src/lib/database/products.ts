import { supabaseAdmin } from "@/lib/supabase/admin";

export type ProductStatus = "Aktif" | "Nonaktif";

export type Product = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  initial_stock: number;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

const productColumns = `
  id,
  organization_id,
  code,
  name,
  category,
  unit,
  initial_stock,
  current_stock,
  cost_price,
  selling_price,
  minimum_stock,
  status,
  created_at,
  updated_at
`;

export async function getProductsByOrganization(
  organizationId: string,
  search: string,
): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(productColumns)
    .eq("organization_id", organizationId)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const products = (data ?? []) as Product[];
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
}

export async function getProductByIdForOrganization(
  productId: string,
  organizationId: string,
): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(productColumns)
    .eq("id", productId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }

  return (data as Product | null) ?? null;
}
