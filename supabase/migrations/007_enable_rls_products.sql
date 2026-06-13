alter table public.products enable row level security;

drop policy if exists "products_select_active_owner_or_cashier_organization"
  on public.products;
create policy "products_select_active_owner_or_cashier_organization"
  on public.products
  for select
  using (
    public.is_active_profile()
    and (
      public.is_owner()
      or public.is_cashier()
    )
    and organization_id = public.current_organization_id()
  );

drop policy if exists "products_insert_owner_organization"
  on public.products;
create policy "products_insert_owner_organization"
  on public.products
  for insert
  with check (
    public.is_owner()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "products_update_owner_organization"
  on public.products;
create policy "products_update_owner_organization"
  on public.products
  for update
  using (
    public.is_owner()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_owner()
    and organization_id = public.current_organization_id()
  );
