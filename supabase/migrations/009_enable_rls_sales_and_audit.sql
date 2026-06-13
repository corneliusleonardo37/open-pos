alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "sales_select_owner_organization_or_cashier_own"
  on public.sales;
create policy "sales_select_owner_organization_or_cashier_own"
  on public.sales
  for select
  using (
    public.is_active_profile()
    and organization_id = public.current_organization_id()
    and (
      public.is_owner()
      or (
        public.is_cashier()
        and created_by = public.current_profile_id()
      )
    )
  );

drop policy if exists "sales_insert_owner_or_cashier_own_branch"
  on public.sales;
create policy "sales_insert_owner_or_cashier_own_branch"
  on public.sales
  for insert
  with check (
    public.is_active_profile()
    and (
      public.is_owner()
      or public.is_cashier()
    )
    and organization_id = public.current_organization_id()
    and branch_id = public.current_branch_id()
    and created_by = public.current_profile_id()
  );

drop policy if exists "sale_items_select_owner_organization"
  on public.sale_items;
create policy "sale_items_select_owner_organization"
  on public.sale_items
  for select
  using (
    public.is_active_profile()
    and public.is_owner()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "sale_items_insert_owner_or_cashier_valid_sale"
  on public.sale_items;
create policy "sale_items_insert_owner_or_cashier_valid_sale"
  on public.sale_items
  for insert
  with check (
    public.is_active_profile()
    and (
      public.is_owner()
      or public.is_cashier()
    )
    and organization_id = public.current_organization_id()
    and branch_id = public.current_branch_id()
    and exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and s.organization_id = public.current_organization_id()
        and (
          public.is_owner()
          or (
            public.is_cashier()
            and s.created_by = public.current_profile_id()
          )
        )
    )
  );

drop policy if exists "audit_logs_select_owner_organization"
  on public.audit_logs;
create policy "audit_logs_select_owner_organization"
  on public.audit_logs
  for select
  using (
    public.is_active_profile()
    and public.is_owner()
    and organization_id = public.current_organization_id()
  );
