"use client";

import { useActionState } from "react";

import {
  resetPasswordAction,
  type UserFormState,
} from "@/app/(app)/users/actions";

const initialState: UserFormState = {
  error: null,
};

export function PasswordResetForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
        Password baru
        <input
          name="password"
          type="password"
          required
          className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
      </label>
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Reset..." : "Reset password"}
      </button>
    </form>
  );
}
