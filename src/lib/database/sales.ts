import { supabaseAdmin } from "@/lib/supabase/admin";

export type SaleProductOption = {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  cost_price: number;
  selling_price: number;
};

export async function getSaleProductOptions(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, code, name, unit, current_stock, cost_price, selling_price")
    .eq("organization_id", organizationId)
    .eq("status", "Aktif")
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sale products: ${error.message}`);
  }

  return (data ?? []) as SaleProductOption[];
}
