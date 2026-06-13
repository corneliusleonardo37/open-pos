import { redirect } from "next/navigation";

import { SalesRegister } from "@/app/(app)/sales/sales-register";
import { getCurrentUserProfile } from "@/lib/database/profiles";
import { getSaleProductOptions } from "@/lib/database/sales";

function SalesError({ message }: { message: string }) {
  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-semibold text-zinc-950">Penjualan</h1>
      <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">
          Penjualan belum bisa dimuat
        </h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </section>
    </div>
  );
}

export default async function SalesPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner" && profile.role !== "Kasir") {
    redirect("/dashboard");
  }

  let products: Awaited<ReturnType<typeof getSaleProductOptions>> = [];
  let errorMessage: string | null = null;

  try {
    products = await getSaleProductOptions(profile.organization_id);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi error saat membaca produk penjualan.";
  }

  if (errorMessage) {
    return <SalesError message={errorMessage} />;
  }

  return (
    <div className="max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Penjualan</h1>
        <p className="mt-2 text-zinc-600">
          Pilih produk, susun cart, dan proses pembayaran kasir.
        </p>
      </div>

      <div className="mt-6">
        <SalesRegister products={products} />
      </div>
    </div>
  );
}
