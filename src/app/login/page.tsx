import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/database/profiles";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">Open POS</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950">
          Masuk ke akun
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Gunakan akun Owner atau Kasir yang sudah dibuat di Supabase Auth.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
