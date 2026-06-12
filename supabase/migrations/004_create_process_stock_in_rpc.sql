create or replace function public.process_stock_in(
  p_organization_id uuid,
  p_branch_id uuid,
  p_created_by uuid,
  p_product_id uuid,
  p_qty numeric,
  p_unit_cost numeric,
  p_supplier text,
  p_note text
)
returns table (
  stock_in_id uuid,
  product_id uuid,
  new_stock numeric,
  unit_cost numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_stock_in_id uuid;
  v_qty numeric(14, 2) := coalesce(p_qty, 0);
  v_unit_cost numeric(14, 2) := coalesce(p_unit_cost, 0);
  v_new_stock numeric(14, 2);
  v_created_at timestamptz := now();
begin
  if p_organization_id is null then
    raise exception 'Organization tidak valid.';
  end if;

  if p_branch_id is null then
    raise exception 'Branch wajib dipilih untuk barang masuk.';
  end if;

  if p_created_by is null then
    raise exception 'User pembuat barang masuk tidak valid.';
  end if;

  if p_product_id is null then
    raise exception 'Produk wajib dipilih.';
  end if;

  if v_qty <= 0 then
    raise exception 'Qty masuk harus lebih dari 0.';
  end if;

  if v_unit_cost < 0 then
    raise exception 'Harga modal baru tidak boleh negatif.';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.id = p_branch_id
      and b.organization_id = p_organization_id
  ) then
    raise exception 'Branch tidak valid untuk organization ini.';
  end if;

  if not exists (
    select 1
    from public.profiles pr
    where pr.id = p_created_by
      and pr.organization_id = p_organization_id
      and pr.status = 'Aktif'
  ) then
    raise exception 'User tidak valid atau sedang nonaktif.';
  end if;

  select
    p.id,
    p.code,
    p.name,
    p.current_stock,
    p.cost_price,
    p.status
  into v_product
  from public.products p
  where p.id = p_product_id
    and p.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Produk tidak ditemukan.';
  end if;

  if v_product.status <> 'Aktif' then
    raise exception 'Produk % - % tidak aktif.', v_product.code, v_product.name;
  end if;

  v_new_stock := (v_product.current_stock + v_qty)::numeric(14, 2);

  insert into public.stock_ins (
    organization_id,
    branch_id,
    product_id,
    qty,
    unit_cost,
    supplier,
    note,
    created_by,
    created_at
  )
  values (
    p_organization_id,
    p_branch_id,
    p_product_id,
    v_qty,
    v_unit_cost,
    nullif(trim(coalesce(p_supplier, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    p_created_by,
    v_created_at
  )
  returning id into v_stock_in_id;

  update public.products p
  set
    current_stock = v_new_stock,
    cost_price = case
      when v_unit_cost > 0 then v_unit_cost
      else p.cost_price
    end,
    updated_at = v_created_at
  where p.id = p_product_id
    and p.organization_id = p_organization_id;

  insert into public.audit_logs (
    organization_id,
    branch_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  )
  values (
    p_organization_id,
    p_branch_id,
    p_created_by,
    'stock_in_created',
    'stock_ins',
    v_stock_in_id,
    jsonb_build_object(
      'product_id', p_product_id,
      'product_code', v_product.code,
      'product_name', v_product.name,
      'qty', v_qty,
      'previous_stock', v_product.current_stock,
      'next_stock', v_new_stock,
      'unit_cost', v_unit_cost,
      'supplier', nullif(trim(coalesce(p_supplier, '')), '')
    ),
    v_created_at
  );

  return query
  select
    v_stock_in_id,
    p_product_id,
    v_new_stock,
    v_unit_cost;
end;
$$;

revoke all on function public.process_stock_in(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.process_stock_in(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text
) to service_role;
