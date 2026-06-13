alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.branches enable row level security;

drop policy if exists "profiles_select_active_self_or_owner_organization"
  on public.profiles;
create policy "profiles_select_active_self_or_owner_organization"
  on public.profiles
  for select
  using (
    public.is_active_profile()
    and (
      id = public.current_profile_id()
      or (
        public.is_owner()
        and organization_id = public.current_organization_id()
      )
    )
  );

drop policy if exists "profiles_insert_owner_organization"
  on public.profiles;
create policy "profiles_insert_owner_organization"
  on public.profiles
  for insert
  with check (
    public.is_owner()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "profiles_update_owner_organization"
  on public.profiles;
create policy "profiles_update_owner_organization"
  on public.profiles
  for update
  using (
    public.is_owner()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_owner()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "organizations_select_current_active_organization"
  on public.organizations;
create policy "organizations_select_current_active_organization"
  on public.organizations
  for select
  using (
    public.is_active_profile()
    and id = public.current_organization_id()
  );

drop policy if exists "organizations_update_owner_current_organization"
  on public.organizations;
create policy "organizations_update_owner_current_organization"
  on public.organizations
  for update
  using (
    public.is_owner()
    and id = public.current_organization_id()
  )
  with check (
    public.is_owner()
    and id = public.current_organization_id()
  );

drop policy if exists "branches_select_owner_organization_or_cashier_branch"
  on public.branches;
create policy "branches_select_owner_organization_or_cashier_branch"
  on public.branches
  for select
  using (
    public.is_active_profile()
    and organization_id = public.current_organization_id()
    and (
      public.is_owner()
      or (
        public.is_cashier()
        and id = public.current_branch_id()
      )
    )
  );

drop policy if exists "branches_insert_owner_organization"
  on public.branches;
create policy "branches_insert_owner_organization"
  on public.branches
  for insert
  with check (
    public.is_owner()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "branches_update_owner_organization"
  on public.branches;
create policy "branches_update_owner_organization"
  on public.branches
  for update
  using (
    public.is_owner()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_owner()
    and organization_id = public.current_organization_id()
  );
