"use client";

import { useActionState, useState } from "react";

import {
  createUserAction,
  updateUserAction,
  type UserFormState,
} from "@/app/(app)/users/actions";
import type { AppUser, BranchOption } from "@/lib/database/users";

const initialState: UserFormState = {
  error: null,
};

type FormValues = {
  fullName: string;
  email: string;
  password: string;
  role: "Owner" | "Kasir";
  branchId: string;
  status: "Aktif" | "Nonaktif";
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function getInitialValues(user?: AppUser | null): FormValues {
  return {
    fullName: user?.full_name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "Kasir",
    branchId: user?.branch_id ?? "",
    status: user?.status ?? "Aktif",
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function TextInput({
  label,
  name,
  type = "text",
  required = false,
  value,
  onChange,
  error,
  readOnly = false,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={[
          "min-h-11 rounded-md border px-3 text-sm outline-none focus:ring-2",
          readOnly
            ? "border-zinc-300 bg-zinc-100 text-zinc-700"
            : "bg-white text-zinc-950 focus:border-emerald-700 focus:ring-emerald-700/20",
          error
            ? "border-red-300 focus:border-red-600 focus:ring-red-600/20"
            : "border-zinc-300",
        ].join(" ")}
      />
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

export function UserForm({
  user,
  branches,
}: {
  user?: AppUser | null;
  branches: BranchOption[];
}) {
  const isEditing = Boolean(user);
  const action = isEditing ? updateUserAction : createUserAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [values, setValues] = useState<FormValues>(() =>
    getInitialValues(user),
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  function updateValue<Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [key]: undefined,
    }));
    setClientError(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Nama lengkap wajib diisi.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email wajib diisi.";
    } else if (!isValidEmail(values.email.trim())) {
      nextErrors.email = "Format email tidak valid.";
    }

    if (!isEditing && values.password.length < 6) {
      nextErrors.password = "Password awal minimal 6 karakter.";
    }

    if (values.role !== "Owner" && values.role !== "Kasir") {
      nextErrors.role = "Role wajib Owner atau Kasir.";
    }

    if (values.role === "Kasir" && !values.branchId) {
      nextErrors.branchId = "Branch wajib dipilih untuk Kasir.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setClientError("Periksa lagi field yang bertanda merah.");
      return false;
    }

    setClientError(null);
    return true;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!validateForm()) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} noValidate onSubmit={handleSubmit} className="mt-5">
      {user ? <input type="hidden" name="user_id" value={user.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextInput
          label="Nama lengkap"
          name="full_name"
          required
          value={values.fullName}
          onChange={(value) => updateValue("fullName", value)}
          error={fieldErrors.fullName}
          autoComplete="name"
        />
        {isEditing ? (
          <TextInput
            label="Email"
            name="email_display"
            type="email"
            value={values.email}
            onChange={(value) => updateValue("email", value)}
            readOnly
            autoComplete="email"
          />
        ) : (
          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            value={values.email}
            onChange={(value) => updateValue("email", value)}
            error={fieldErrors.email}
            autoComplete="email"
          />
        )}
        {!isEditing ? (
          <TextInput
            label="Password awal"
            name="password"
            type="password"
            required
            value={values.password}
            onChange={(value) => updateValue("password", value)}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Role
          <select
            name="role"
            value={values.role}
            onChange={(event) =>
              updateValue("role", event.target.value as FormValues["role"])
            }
            aria-invalid={Boolean(fieldErrors.role)}
            className={[
              "min-h-11 rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none focus:ring-2",
              fieldErrors.role
                ? "border-red-300 focus:border-red-600 focus:ring-red-600/20"
                : "border-zinc-300 focus:border-emerald-700 focus:ring-emerald-700/20",
            ].join(" ")}
          >
            <option value="Owner">Owner</option>
            <option value="Kasir">Kasir</option>
          </select>
          {fieldErrors.role ? (
            <span className="text-xs text-red-700">{fieldErrors.role}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Branch
          <select
            name="branch_id"
            value={values.branchId}
            onChange={(event) => updateValue("branchId", event.target.value)}
            aria-invalid={Boolean(fieldErrors.branchId)}
            className={[
              "min-h-11 rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none focus:ring-2",
              fieldErrors.branchId
                ? "border-red-300 focus:border-red-600 focus:ring-red-600/20"
                : "border-zinc-300 focus:border-emerald-700 focus:ring-emerald-700/20",
            ].join(" ")}
          >
            <option value="">Tanpa branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {fieldErrors.branchId ? (
            <span className="text-xs text-red-700">
              {fieldErrors.branchId}
            </span>
          ) : null}
        </label>
        {isEditing ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Status
            <select
              name="status"
              value={values.status}
              onChange={(event) =>
                updateValue(
                  "status",
                  event.target.value as FormValues["status"],
                )
              }
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </label>
        ) : null}
      </div>

      {!isEditing ? (
        <p className="mt-3 text-sm text-zinc-500">
          User baru otomatis dibuat di Supabase Auth dan status profile dibuat
          Aktif. Branch wajib untuk Kasir.
        </p>
      ) : null}

      {clientError || state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {clientError ?? state.error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Menyimpan..."
            : isEditing
              ? "Simpan perubahan"
              : "Tambah user"}
        </button>
        {isEditing ? (
          <a
            href="/users"
            className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Batal edit
          </a>
        ) : null}
      </div>
    </form>
  );
}
