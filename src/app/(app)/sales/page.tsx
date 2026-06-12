import { redirect } from "next/navigation";

import { SalesRegister } from "@/app/(app)/sales/sales-register";
import { getCurrentUserProfile } from "@/lib/database/profiles";
import { getSaleProductOptions } from "@/lib/database/sales";

export default async function SalesPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "Owner" && profile.role !== "Kasir") {
    redirect("/dashboard");
  }

  const products = await getSaleProductOptions(profile.organization_id);

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
