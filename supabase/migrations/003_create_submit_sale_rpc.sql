create or replace function public.submit_sale(
  p_organization_id uuid,
  p_branch_id uuid,
  p_created_by uuid,
  p_invoice_number text,
  p_payment_method text,
  p_discount numeric,
  p_paid_amount numeric,
  p_items jsonb
)
returns table (
  sale_id uuid,
  invoice_number text,
  total numeric,
  paid_amount numeric,
  change_amount numeric,
  created_at timestamptz,
  payment_method text,
  subtotal numeric,
  discount numeric,
  total_qty numeric,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_product record;
  v_sale_id uuid;
  v_created_at timestamptz := now();
  v_total_qty numeric(14, 2) := 0;
  v_subtotal numeric(14, 2) := 0;
  v_discount numeric(14, 2) := coalesce(p_discount, 0);
  v_total numeric(14, 2) := 0;
  v_paid_amount numeric(14, 2) := coalesce(p_paid_amount, 0);
  v_change_amount numeric(14, 2) := 0;
  v_line_total numeric(14, 2);
  v_estimated_profit numeric(14, 2);
  v_items jsonb := '[]'::jsonb;
begin
  if p_organization_id is null then
    raise exception 'Organization tidak valid.';
  end if;

  if p_branch_id is null then
    raise exception 'Branch wajib dipilih untuk transaksi.';
  end if;

  if p_created_by is null then
    raise exception 'User pembuat transaksi tidak valid.';
  end if;

  if nullif(trim(coalesce(p_invoice_number, '')), '') is null then
    raise exception 'Invoice number wajib diisi.';
  end if;

  if p_payment_method not in ('Cash', 'Transfer', 'QRIS') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;

  if v_discount < 0 then
    raise exception 'Diskon tidak boleh negatif.';
  end if;

  if v_paid_amount < 0 then
    raise exception 'Nominal dibayar tidak boleh negatif.';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Cart masih kosong.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart masih kosong.';
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

  for v_item in
    select
      item.product_id,
      sum(item.qty)::numeric(14, 2) as qty
    from jsonb_to_recordset(p_items) as item(product_id uuid, qty numeric)
    group by item.product_id
  loop
    if v_item.product_id is null then
      raise exception 'Produk di cart tidak valid.';
    end if;

    if v_item.qty is null or v_item.qty <= 0 then
      raise exception 'Qty item harus lebih dari 0.';
    end if;

    select
      p.id,
      p.code,
      p.name,
      p.current_stock,
      p.cost_price,
      p.selling_price,
      p.status
    into v_product
    from public.products p
    where p.id = v_item.product_id
      and p.organization_id = p_organization_id
    for update;

    if not found then
      raise exception 'Produk di cart tidak ditemukan.';
    end if;

    if v_product.status <> 'Aktif' then
      raise exception 'Produk % - % tidak aktif.', v_product.code, v_product.name;
    end if;

    if v_product.current_stock < v_item.qty then
      raise exception
        'Stok % - % tidak cukup. Stok tersedia %.',
        v_product.code,
        v_product.name,
        v_product.current_stock;
    end if;

    v_line_total := (v_item.qty * v_product.selling_price)::numeric(14, 2);
    v_estimated_profit :=
      ((v_product.selling_price - v_product.cost_price) * v_item.qty)::numeric(14, 2);
    v_total_qty := (v_total_qty + v_item.qty)::numeric(14, 2);
    v_subtotal := (v_subtotal + v_line_total)::numeric(14, 2);

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'code', v_product.code,
        'name', v_product.name,
        'qty', v_item.qty,
        'unit_price', v_product.selling_price,
        'unit_cost', v_product.cost_price,
        'line_total', v_line_total,
        'estimated_profit', v_estimated_profit,
        'previous_stock', v_product.current_stock,
        'next_stock', (v_product.current_stock - v_item.qty)::numeric(14, 2)
      )
    );
  end loop;

  if v_total_qty <= 0 then
    raise exception 'Cart masih kosong.';
  end if;

  v_total := greatest((v_subtotal - v_discount)::numeric(14, 2), 0);

  if p_payment_method = 'Cash' then
    if v_paid_amount < v_total then
      raise exception 'Pembayaran cash kurang dari total.';
    end if;

    v_change_amount := (v_paid_amount - v_total)::numeric(14, 2);
  else
    v_paid_amount := v_total;
    v_change_amount := 0;
  end if;

  insert into public.sales (
    organization_id,
    branch_id,
    invoice_number,
    total_qty,
    subtotal,
    discount,
    total,
    payment_method,
    paid_amount,
    change_amount,
    created_by,
    created_at
  )
  values (
    p_organization_id,
    p_branch_id,
    p_invoice_number,
    v_total_qty,
    v_subtotal,
    v_discount,
    v_total,
    p_payment_method,
    v_paid_amount,
    v_change_amount,
    p_created_by,
    v_created_at
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    organization_id,
    branch_id,
    sale_id,
    product_id,
    qty,
    unit_price,
    line_total,
    unit_cost,
    estimated_profit,
    created_at
  )
  select
    p_organization_id,
    p_branch_id,
    v_sale_id,
    item.product_id,
    item.qty,
    item.unit_price,
    item.line_total,
    item.unit_cost,
    item.estimated_profit,
    v_created_at
  from jsonb_to_recordset(v_items) as item(
    product_id uuid,
    qty numeric,
    unit_price numeric,
    line_total numeric,
    unit_cost numeric,
    estimated_profit numeric
  );

  update public.products p
  set
    current_stock = item.next_stock,
    updated_at = v_created_at
  from jsonb_to_recordset(v_items) as item(
    product_id uuid,
    next_stock numeric
  )
  where p.id = item.product_id
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
    'sale_created',
    'sales',
    v_sale_id,
    jsonb_build_object(
      'invoice_number', p_invoice_number,
      'total_qty', v_total_qty,
      'subtotal', v_subtotal,
      'discount', v_discount,
      'total', v_total,
      'payment_method', p_payment_method,
      'paid_amount', v_paid_amount,
      'change_amount', v_change_amount,
      'items', v_items
    ),
    v_created_at
  );

  return query
  select
    v_sale_id,
    p_invoice_number,
    v_total,
    v_paid_amount,
    v_change_amount,
    v_created_at,
    p_payment_method,
    v_subtotal,
    v_discount,
    v_total_qty,
    v_items;
end;
$$;

revoke all on function public.submit_sale(
  uuid,
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  jsonb
) from public, anon, authenticated;

grant execute on function public.submit_sale(
  uuid,
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  jsonb
) to service_role;
