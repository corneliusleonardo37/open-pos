# Open POS MVP Release Checklist

Use this checklist before using Open POS as an internal MVP.

## Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set for the target Supabase project.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set for the target Supabase project.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only in the server/deployment environment.
- [ ] `.env.local` exists only on local machines and is not committed.
- [ ] Production environment variables are configured in the hosting provider.
- [ ] Build command is configured as `npm.cmd run build` locally or `npm run build` on Linux-based hosting.

## Supabase Setup

- [ ] Supabase project URL matches the intended production or internal MVP project.
- [ ] Supabase anon key matches the same project.
- [ ] Supabase service role key matches the same project.
- [ ] All migrations through the latest RLS migration have been run successfully.
- [ ] RLS helper functions are present and return expected values for authenticated users.
- [ ] RLS policies are active for identity and business tables.

## Security Notes

- [ ] Do not commit `.env.local`.
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it to browser/client code.
- [ ] Do not paste service role keys into screenshots, issue trackers, chat logs, or public docs.
- [ ] Do not expose `cost_price`, `unit_cost`, or `estimated_profit` to Kasir-facing client screens.
- [ ] Confirm Sales/POS product data sent to Kasir does not include `cost_price`.
- [ ] Confirm inactive users cannot enter the app.
- [ ] Confirm Owner/Kasir route access still matches the intended permissions.

## Final Accounts

- [ ] Final Owner account exists in Supabase Auth.
- [ ] Final Owner profile exists with `status = 'Aktif'`.
- [ ] Final Owner profile has the correct `organization_id`.
- [ ] Final Owner profile has the expected `branch_id` if stock-in/sales will be used.
- [ ] Final Kasir account exists in Supabase Auth.
- [ ] Final Kasir profile exists with `status = 'Aktif'`.
- [ ] Final Kasir profile has the correct `organization_id`.
- [ ] Final Kasir profile has a valid `branch_id`.
- [ ] Test Nonaktif user cannot access the app.

## Initial Data

- [ ] Organization data is correct.
- [ ] Branch data is correct.
- [ ] Initial product list is entered.
- [ ] Product codes are unique per organization.
- [ ] Product selling prices are correct.
- [ ] Product cost prices are correct for Owner/reporting use.
- [ ] Product initial/current stock values are correct.
- [ ] Product minimum stock values are set.
- [ ] Inactive products are marked `Nonaktif`.

## Manual Test Scenarios

- [ ] Owner can log in.
- [ ] Owner can access Dashboard, Products, Stock In, Sales, Reports, Audit Log, and Users.
- [ ] Kasir can log in.
- [ ] Kasir can access Dashboard and Sales only.
- [ ] Kasir cannot access Products, Stock In, Reports, Audit Log, or Users.
- [ ] Nonaktif user cannot enter the app.
- [ ] Product create/edit/deactivate works for Owner.
- [ ] Stock-in works and increases stock.
- [ ] Stock-in creates audit log entry.
- [ ] Cash sale works with correct paid amount and change.
- [ ] QRIS sale works.
- [ ] Transfer sale works.
- [ ] Sale decreases stock.
- [ ] Sale creates audit log entry.
- [ ] Dashboard Owner shows organization-level daily sales.
- [ ] Dashboard Kasir shows only the Kasir's own transactions.
- [ ] Reports load for Owner.
- [ ] Reports show expected totals for test sales.
- [ ] Audit Log loads for Owner.
- [ ] User Management create/update/deactivate/reset password flows work for Owner.

## Backup And Export

- [ ] Before MVP use, take a manual Supabase database backup or export.
- [ ] Export key tables manually if no full backup is available: `organizations`, `branches`, `profiles`, `products`, `stock_ins`, `sales`, `sale_items`, `audit_logs`.
- [ ] Store backup/export files in a private location.
- [ ] Record backup time and Supabase project name.
- [ ] Repeat manual export after important testing or before operational use.

## Deployment Notes

- [ ] Run `npm.cmd run build` locally before deployment.
- [ ] Verify deployment environment variables before first deploy.
- [ ] Deploy from the intended git commit/checkpoint.
- [ ] After deploy, test login with Owner and Kasir accounts.
- [ ] Test one small transaction in the deployed environment.
- [ ] Confirm no service role key is visible in browser devtools/network responses.
- [ ] Confirm app routes redirect correctly after logout.
- [ ] Keep a rollback checkpoint ready.

## Known Limitations

- Service role is still used heavily in server-side application code.
- CSV export is not available yet.
- Automatic backup is not available yet.
- Barcode scanner support is not available yet.
- Thermal printer support is not available yet.
- RLS protects database access, but service role queries bypass RLS by design.
- This MVP is intended for internal use and manual operational checks before broader rollout.
