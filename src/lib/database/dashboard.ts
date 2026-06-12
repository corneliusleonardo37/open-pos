import type { CurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

const jakartaUtcOffsetMs = 7 * 60 * 60 * 1000;

export type DashboardSale = {
  id: string;
  invoice_number: string;
  total: number;
  total_qty: number;
  payment_method: "Cash" | "Transfer" | "QRIS";
  created_by: string | null;
  created_at: string;
  cashier_name: string;
};

export type LowStockProduct = {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  current_stock: number;
  minimum_stock: number;
};

export type DashboardData = {
  todayRange: {
    start: string;
    end: string;
    label: string;
  };
  todaySalesTotal: number;
  todayTransactionCount: number;
  latestTransactions: DashboardSale[];
  ownerMetrics: {
    todayEstimatedProfit: number;
    activeProductCount: number;
    totalAvailableStock: number;
    lowStockProducts: LowStockProduct[];
  } | null;
};

type SaleRow = {
  id: string;
  invoice_number: string;
  total: number | string | null;
  total_qty: number | string | null;
  payment_method: "Cash" | "Transfer" | "QRIS";
  created_by: string | null;
  created_at: string;
};

type ProductStockRow = {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  current_stock: number | string | null;
  minimum_stock: number | string | null;
};

function getTodayRangeInJakarta(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(now);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const year = Number(getPart("year"));
  const month = Number(getPart("month"));
  const day = Number(getPart("day"));
  const startUtc = new Date(
    Date.UTC(year, month - 1, day) - jakartaUtcOffsetMs,
  );
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  const label = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(now);

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
    label,
  };
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function getSalesForRange(
  profile: CurrentUserProfile,
  start: string,
  end: string,
) {
  let query = supabaseAdmin
    .from("sales")
    .select(
      "id, invoice_number, total, total_qty, payment_method, created_by, created_at",
    )
    .eq("organization_id", profile.organization_id)
    .gte("created_at", start)
    .lt("created_at", end);

  if (profile.role === "Kasir") {
    query = query.eq("created_by", profile.id);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    throw new Error(`Gagal membaca penjualan hari ini: ${error.message}`);
  }

  return (data ?? []) as SaleRow[];
}

async function getLatestSales(profile: CurrentUserProfile) {
  let query = supabaseAdmin
    .from("sales")
    .select(
      "id, invoice_number, total, total_qty, payment_method, created_by, created_at",
    )
    .eq("organization_id", profile.organization_id);

  if (profile.role === "Kasir") {
    query = query.eq("created_by", profile.id);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Gagal membaca transaksi terbaru: ${error.message}`);
  }

  return (data ?? []) as SaleRow[];
}

async function getCashierNames(
  organizationId: string,
  cashierIds: Array<string | null>,
) {
  const uniqueCashierIds = Array.from(
    new Set(cashierIds.filter((id): id is string => Boolean(id))),
  );

  if (uniqueCashierIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .in("id", uniqueCashierIds);

  if (error) {
    throw new Error(`Gagal membaca nama kasir: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((profile) => [
      String(profile.id),
      String(profile.full_name),
    ]),
  );
}

function mapSalesRows(sales: SaleRow[], cashierNames: Map<string, string>) {
  return sales.map((sale) => ({
    id: sale.id,
    invoice_number: sale.invoice_number,
    total: toNumber(sale.total),
    total_qty: toNumber(sale.total_qty),
    payment_method: sale.payment_method,
    created_by: sale.created_by,
    created_at: sale.created_at,
    cashier_name: sale.created_by
      ? cashierNames.get(sale.created_by) ?? "Kasir"
      : "Kasir",
  }));
}

async function getTodayEstimatedProfit(
  organizationId: string,
  start: string,
  end: string,
) {
  const { data, error } = await supabaseAdmin
    .from("sale_items")
    .select("estimated_profit")
    .eq("organization_id", organizationId)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) {
    throw new Error(`Gagal membaca estimasi profit: ${error.message}`);
  }

  return (data ?? []).reduce(
    (total, item) => total + toNumber(item.estimated_profit),
    0,
  );
}

async function getActiveProductStock(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, code, name, unit, current_stock, minimum_stock")
    .eq("organization_id", organizationId)
    .eq("status", "Aktif")
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Gagal membaca stok produk: ${error.message}`);
  }

  const products = ((data ?? []) as ProductStockRow[]).map((product) => ({
    id: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    current_stock: toNumber(product.current_stock),
    minimum_stock: toNumber(product.minimum_stock),
  }));

  return {
    activeProductCount: products.length,
    totalAvailableStock: products.reduce(
      (total, product) => total + product.current_stock,
      0,
    ),
    lowStockProducts: products
      .filter((product) => product.current_stock <= product.minimum_stock)
      .sort((firstProduct, secondProduct) => {
        const firstGap = firstProduct.current_stock - firstProduct.minimum_stock;
        const secondGap =
          secondProduct.current_stock - secondProduct.minimum_stock;

        return firstGap - secondGap;
      }),
  };
}

export async function getDashboardData(
  profile: CurrentUserProfile,
): Promise<DashboardData> {
  const todayRange = getTodayRangeInJakarta();
  const [todaySales, latestSales] = await Promise.all([
    getSalesForRange(profile, todayRange.start, todayRange.end),
    getLatestSales(profile),
  ]);
  const cashierNames = await getCashierNames(
    profile.organization_id,
    latestSales.map((sale) => sale.created_by),
  );
  const todaySalesTotal = todaySales.reduce(
    (total, sale) => total + toNumber(sale.total),
    0,
  );

  if (profile.role === "Kasir") {
    return {
      todayRange,
      todaySalesTotal,
      todayTransactionCount: todaySales.length,
      latestTransactions: mapSalesRows(latestSales, cashierNames),
      ownerMetrics: null,
    };
  }

  const [todayEstimatedProfit, productStock] = await Promise.all([
    getTodayEstimatedProfit(
      profile.organization_id,
      todayRange.start,
      todayRange.end,
    ),
    getActiveProductStock(profile.organization_id),
  ]);

  return {
    todayRange,
    todaySalesTotal,
    todayTransactionCount: todaySales.length,
    latestTransactions: mapSalesRows(latestSales, cashierNames),
    ownerMetrics: {
      todayEstimatedProfit,
      activeProductCount: productStock.activeProductCount,
      totalAvailableStock: productStock.totalAvailableStock,
      lowStockProducts: productStock.lowStockProducts,
    },
  };
}
