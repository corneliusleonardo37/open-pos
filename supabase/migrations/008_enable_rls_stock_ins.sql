alter table public.stock_ins enable row level security;

drop policy if exists "stock_ins_select_owner_organization"
  on public.stock_ins;
create policy "stock_ins_select_owner_organization"
  on public.stock_ins
  for select
  using (
    public.is_active_profile()
    and public.is_owner()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "stock_ins_insert_owner_organization_branch"
  on public.stock_ins;
create policy "stock_ins_insert_owner_organization_branch"
  on public.stock_ins
  for insert
  with check (
    public.is_active_profile()
    and public.is_owner()
    and organization_id = public.current_organization_id()
    and branch_id = public.current_branch_id()
  );
