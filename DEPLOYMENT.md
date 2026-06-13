# Open POS Deployment Guide

Recommended platform: Vercel.

This guide prepares Open POS for production/internal MVP deployment. Do not deploy until the release checklist and smoke tests are ready.

## Prerequisites

- GitHub repository is up to date with the intended release checkpoint.
- Supabase production or internal MVP project is ready.
- All required Supabase migrations have been applied to the target Supabase project.
- Owner and Kasir production accounts are ready.
- Initial organization, branch, and product data are ready.
- Local build succeeds before deployment.

## Required Environment Variables

Set these in the Vercel project environment variables:

| Name | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client and server | Use the Supabase project URL for the production/internal MVP project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client and server | Use the anon public key from the same Supabase project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Sensitive. Never expose this to browser/client code. |

Security notes:

- Do not commit `.env.local`.
- Do not paste `SUPABASE_SERVICE_ROLE_KEY` into screenshots, public docs, browser code, or issue trackers.
- `SUPABASE_SERVICE_ROLE_KEY` must only exist in server/deployment environment variables.
- Keep `cost_price`, `unit_cost`, and `estimated_profit` away from Kasir-facing client payloads.

## Local Build Before Deploy

On Windows:

```powershell
npm.cmd run build
```

On Linux/macOS or Vercel:

```bash
npm run build
```

The expected build command for Vercel is:

```bash
npm run build
```

## Deploy From GitHub To Vercel

1. Push the intended release checkpoint to GitHub.
2. Open Vercel.
3. Choose **Add New Project**.
4. Import the Open POS GitHub repository.
5. Keep the framework preset as **Next.js**.
6. Confirm build command is `npm run build`.
7. Add the required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
8. Make sure the environment values point to the intended Supabase production/internal MVP project.
9. Deploy.
10. After deployment finishes, open the production URL and run the smoke test checklist below.

## Setting Production Supabase URL And Keys

In Supabase:

1. Open the target Supabase project.
2. Go to **Project Settings**.
3. Open **API**.
4. Copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`.
5. Copy the anon public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
7. Store the service role key only in Vercel environment variables or another server-only secret store.

## Production Smoke Test Checklist

- [ ] Login as Owner.
- [ ] Owner can open Dashboard.
- [ ] Owner can add a product.
- [ ] Owner can perform stock-in.
- [ ] Owner can perform a Cash transaction.
- [ ] Owner can perform a QRIS transaction.
- [ ] Owner can perform a Transfer transaction.
- [ ] Owner can open Reports and see expected totals.
- [ ] Owner can open Audit Log and see recent actions.
- [ ] Owner can open User Management.
- [ ] Logout works.
- [ ] Login as Kasir.
- [ ] Kasir can open Dashboard.
- [ ] Kasir can open Sales.
- [ ] Kasir cannot open Products, Stock In, Reports, Audit Log, or Users.
- [ ] Kasir can perform a Cash transaction.
- [ ] Kasir can perform a QRIS or Transfer transaction.
- [ ] Nonaktif user is rejected and cannot enter the app.
- [ ] Browser devtools/network responses do not expose `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Sales/POS product data sent to Kasir does not include `cost_price`.

## Troubleshooting

### Build fails with missing environment variable

Check that all required variables are configured in Vercel for the target environment. Local builds require `.env.local`; production builds require Vercel environment variables.

### Login fails for a valid Supabase Auth user

Confirm the user has a row in `public.profiles` with:

- `id` matching the Supabase Auth user id
- correct `organization_id`
- `status = 'Aktif'`
- valid `role`
- valid `branch_id` for Kasir

### Owner or Kasir sees the wrong menu

Check `public.profiles.role` and `public.profiles.status`. The app uses the current authenticated profile to decide access.

### Stock-in or sales submit fails

Check that the current profile has a valid `branch_id`, products are active, stock is sufficient for sales, and the relevant RPC functions exist in Supabase.

### Reports or Audit Log are empty

Confirm transactions or audit events exist in the same organization as the current Owner profile. Also verify date filters.

### RLS-related access issue

Confirm helper functions from migration 005 exist, the user profile is active, and policies are installed for the target tables. Remember that server-side service role queries bypass RLS by design.

### Service role accidentally exposed

Immediately rotate the service role key in Supabase, update Vercel environment variables, redeploy, and audit any place where the key may have been copied.

## Rollback Notes

- Keep the last known-good git checkpoint available.
- Keep a manual Supabase backup/export before production testing.
- If deployment has a UI/runtime regression, roll back to the previous Vercel deployment.
- If data changes are wrong, stop testing and restore from the latest known-good backup/export.
