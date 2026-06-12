import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActiveProductOption = {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  cost_price: number;
};

type StockInRow = {
  id: string;
  organization_id: string;
  product_id: string;
  qty: number;
  unit_cost: number;
  supplier: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockInHistoryItem = StockInRow & {
  product_code: string;
  product_name: string;
  created_by_name: string | null;
};

export async function getActiveProductOptions(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, code, name, unit, current_stock, cost_price")
    .eq("organization_id", organizationId)
    .eq("status", "Aktif")
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active products: ${error.message}`);
  }

  return (data ?? []) as ActiveProductOption[];
}

export async function getRecentStockIns(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("stock_ins")
    .select(
      "id, organization_id, product_id, qty, unit_cost, supplier, note, created_by, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to fetch stock in history: ${error.message}`);
  }

  const stockIns = (data ?? []) as StockInRow[];
  const productIds = Array.from(new Set(stockIns.map((item) => item.product_id)));
  const profileIds = Array.from(
    new Set(
      stockIns
        .map((item) => item.created_by)
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  );

  const { data: products, error: productsError } =
    productIds.length > 0
      ? await supabaseAdmin
          .from("products")
          .select("id, code, name")
          .eq("organization_id", organizationId)
          .in("id", productIds)
      : { data: [], error: null };

  if (productsError) {
    throw new Error(`Failed to fetch stock in products: ${productsError.message}`);
  }

  const { data: profiles, error: profilesError } =
    profileIds.length > 0
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .eq("organization_id", organizationId)
          .in("id", profileIds)
      : { data: [], error: null };

  if (profilesError) {
    throw new Error(`Failed to fetch stock in profiles: ${profilesError.message}`);
  }

  const productMap = new Map(
    (products ?? []).map((product) => [
      product.id as string,
      {
        code: product.code as string,
        name: product.name as string,
      },
    ]),
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      profile.full_name as string,
    ]),
  );

  return stockIns.map((item) => {
    const product = productMap.get(item.product_id);

    return {
      ...item,
      product_code: product?.code ?? "-",
      product_name: product?.name ?? "-",
      created_by_name: item.created_by
        ? profileMap.get(item.created_by) ?? null
        : null,
    };
  }) satisfies StockInHistoryItem[];
}
