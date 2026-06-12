import type { CurrentUserProfile } from "@/lib/database/profiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

const jakartaUtcOffsetMs = 7 * 60 * 60 * 1000;

export type PaymentMethod = "Cash" | "Transfer" | "QRIS";

export type ReportFilters = {
  startDate: string;
  endDate: string;
};

export type ReportItem = {
  id: string;
  sale_id: string;
  product_name: string;
  product_code: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
  estimated_profit: number;
};

export type ReportTransaction = {
  id: string;
  invoice_number: string;
  cashier_name: string;
  payment_method: PaymentMethod;
  total_qty: number;
  subtotal: number;
  discount: number;
  total: number;
  estimated_profit: number;
  created_at: string;
  items: ReportItem[];
};

export type PaymentBreakdown = Record<
  PaymentMethod,
  {
    total: number;
    transaction_count: number;
  }
>;

export type SalesReportData = {
  filters: ReportFilters;
  range: {
    start: string;
    end: string;
  };
  summary: {
    total_omzet: number;
    total_transactions: number;
    total_qty_sold: number;
    estimated_profit: number;
    total_discount: number;
  };
  paymentBreakdown: PaymentBreakdown;
  transactions: ReportTransaction[];
};

type SaleRow = {
  id: string;
  invoice_number: string;
  payment_method: PaymentMethod;
  total_qty: number | string | null;
  subtotal: number | string | null;
  discount: number | string | null;
  total: number | string | null;
  created_by: string | null;
  created_at: string;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string | null;
  qty: number | string | null;
  unit_price: number | string | null;
  unit_cost: number | string | null;
  line_total: number | string | null;
  estimated_profit: number | string | null;
};

type ProductNameRow = {
  id: string;
  code: string;
  name: string;
};

export function getTodayDateInJakarta(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(now);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function normalizeDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return fallback;
  }

  return value;
}

function compareDateString(firstDate: string, secondDate: string) {
  return firstDate.localeCompare(secondDate);
}

function dateStringToJakartaUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day) - jakartaUtcOffsetMs);
}

function getRangeFromFilters(filters: ReportFilters) {
  const start = dateStringToJakartaUtc(filters.startDate);
  const endStart = dateStringToJakartaUtc(filters.endDate);
  const end = new Date(endStart.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function createEmptyPaymentBreakdown(): PaymentBreakdown {
  return {
    Cash: {
      total: 0,
      transaction_count: 0,
    },
    Transfer: {
      total: 0,
      transaction_count: 0,
    },
    QRIS: {
      total: 0,
      transaction_count: 0,
    },
  };
}

export function resolveReportFilters(
  startDate: string | undefined,
  endDate: string | undefined,
): ReportFilters {
  const today = getTodayDateInJakarta();
  const normalizedStartDate = normalizeDate(startDate, today);
  const normalizedEndDate = normalizeDate(endDate, normalizedStartDate);

  if (compareDateString(normalizedEndDate, normalizedStartDate) < 0) {
    return {
      startDate: normalizedStartDate,
      endDate: normalizedStartDate,
    };
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  };
}

async function getSalesRows(organizationId: string, start: string, end: string) {
  const { data, error } = await supabaseAdmin
    .from("sales")
    .select(
      "id, invoice_number, payment_method, total_qty, subtotal, discount, total, created_by, created_at",
    )
    .eq("organization_id", organizationId)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal membaca data sales: ${error.message}`);
  }

  return (data ?? []) as SaleRow[];
}

async function getSaleItemsRows(organizationId: string, saleIds: string[]) {
  if (saleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("sale_items")
    .select(
      "id, sale_id, product_id, qty, unit_price, unit_cost, line_total, estimated_profit",
    )
    .eq("organization_id", organizationId)
    .in("sale_id", saleIds);

  if (error) {
    throw new Error(`Gagal membaca item transaksi: ${error.message}`);
  }

  return (data ?? []) as SaleItemRow[];
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

async function getProductNames(organizationId: string, productIds: string[]) {
  const uniqueProductIds = Array.from(new Set(productIds));

  if (uniqueProductIds.length === 0) {
    return new Map<string, ProductNameRow>();
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, code, name")
    .eq("organization_id", organizationId)
    .in("id", uniqueProductIds);

  if (error) {
    throw new Error(`Gagal membaca nama produk: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as ProductNameRow[]).map((product) => [product.id, product]),
  );
}

export async function getSalesReportData(
  profile: CurrentUserProfile,
  filters: ReportFilters,
): Promise<SalesReportData> {
  const range = getRangeFromFilters(filters);
  const sales = await getSalesRows(profile.organization_id, range.start, range.end);
  const saleIds = sales.map((sale) => sale.id);
  const [saleItems, cashierNames] = await Promise.all([
    getSaleItemsRows(profile.organization_id, saleIds),
    getCashierNames(
      profile.organization_id,
      sales.map((sale) => sale.created_by),
    ),
  ]);
  const productNames = await getProductNames(
    profile.organization_id,
    saleItems
      .map((item) => item.product_id)
      .filter((productId): productId is string => Boolean(productId)),
  );
  const itemsBySaleId = new Map<string, ReportItem[]>();

  saleItems.forEach((item) => {
    const product = item.product_id
      ? productNames.get(item.product_id)
      : undefined;
    const reportItem: ReportItem = {
      id: item.id,
      sale_id: item.sale_id,
      product_name: product?.name ?? "Produk tidak ditemukan",
      product_code: product?.code ?? "-",
      qty: toNumber(item.qty),
      unit_price: toNumber(item.unit_price),
      unit_cost: toNumber(item.unit_cost),
      line_total: toNumber(item.line_total),
      estimated_profit: toNumber(item.estimated_profit),
    };
    const currentItems = itemsBySaleId.get(item.sale_id) ?? [];

    currentItems.push(reportItem);
    itemsBySaleId.set(item.sale_id, currentItems);
  });

  const paymentBreakdown = createEmptyPaymentBreakdown();
  const transactions = sales.map((sale) => {
    const items = itemsBySaleId.get(sale.id) ?? [];
    const estimatedProfit = items.reduce(
      (total, item) => total + item.estimated_profit,
      0,
    );
    const total = toNumber(sale.total);

    paymentBreakdown[sale.payment_method].total += total;
    paymentBreakdown[sale.payment_method].transaction_count += 1;

    return {
      id: sale.id,
      invoice_number: sale.invoice_number,
      cashier_name: sale.created_by
        ? cashierNames.get(sale.created_by) ?? "Kasir"
        : "Kasir",
      payment_method: sale.payment_method,
      total_qty: toNumber(sale.total_qty),
      subtotal: toNumber(sale.subtotal),
      discount: toNumber(sale.discount),
      total,
      estimated_profit: estimatedProfit,
      created_at: sale.created_at,
      items,
    };
  });

  return {
    filters,
    range,
    summary: {
      total_omzet: transactions.reduce(
        (total, transaction) => total + transaction.total,
        0,
      ),
      total_transactions: transactions.length,
      total_qty_sold: transactions.reduce(
        (total, transaction) => total + transaction.total_qty,
        0,
      ),
      estimated_profit: transactions.reduce(
        (total, transaction) => total + transaction.estimated_profit,
        0,
      ),
      total_discount: transactions.reduce(
        (total, transaction) => total + transaction.discount,
        0,
      ),
    },
    paymentBreakdown,
    transactions,
  };
}
