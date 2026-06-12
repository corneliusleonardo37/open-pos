create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_name_per_organization_unique unique (organization_id, name)
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  full_name text not null,
  email text not null,
  role text not null,
  status text not null default 'Aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('Owner', 'Kasir')),
  constraint profiles_status_check check (status in ('Aktif', 'Nonaktif')),
  constraint profiles_email_unique unique (email)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category text,
  unit text,
  initial_stock numeric(14, 2) not null default 0,
  current_stock numeric(14, 2) not null default 0,
  cost_price numeric(14, 2) not null default 0,
  selling_price numeric(14, 2) not null default 0,
  minimum_stock numeric(14, 2) not null default 0,
  status text not null default 'Aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_initial_stock_non_negative check (initial_stock >= 0),
  constraint products_current_stock_non_negative check (current_stock >= 0),
  constraint products_cost_price_non_negative check (cost_price >= 0),
  constraint products_selling_price_non_negative check (selling_price >= 0),
  constraint products_minimum_stock_non_negative check (minimum_stock >= 0),
  constraint products_status_check check (status in ('Aktif', 'Nonaktif')),
  constraint products_code_per_organization_unique unique (organization_id, code)
);

create table stock_ins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  qty numeric(14, 2) not null,
  unit_cost numeric(14, 2) not null default 0,
  supplier text,
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_ins_qty_positive check (qty > 0),
  constraint stock_ins_unit_cost_non_negative check (unit_cost >= 0)
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete restrict,
  invoice_number text not null,
  total_qty numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  payment_method text not null,
  paid_amount numeric(14, 2) not null default 0,
  change_amount numeric(14, 2) not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sales_payment_method_check check (payment_method in ('Cash', 'Transfer', 'QRIS')),
  constraint sales_total_qty_non_negative check (total_qty >= 0),
  constraint sales_subtotal_non_negative check (subtotal >= 0),
  constraint sales_discount_non_negative check (discount >= 0),
  constraint sales_total_non_negative check (total >= 0),
  constraint sales_paid_amount_non_negative check (paid_amount >= 0),
  constraint sales_change_amount_non_negative check (change_amount >= 0),
  constraint sales_invoice_per_organization_unique unique (organization_id, invoice_number)
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete restrict,
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  qty numeric(14, 2) not null,
  unit_price numeric(14, 2) not null,
  line_total numeric(14, 2) not null,
  unit_cost numeric(14, 2) not null default 0,
  estimated_profit numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint sale_items_qty_positive check (qty > 0),
  constraint sale_items_unit_price_non_negative check (unit_price >= 0),
  constraint sale_items_line_total_non_negative check (line_total >= 0),
  constraint sale_items_unit_cost_non_negative check (unit_cost >= 0)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index branches_organization_id_idx on branches (organization_id);

create index profiles_organization_id_idx on profiles (organization_id);
create index profiles_branch_id_idx on profiles (branch_id);

create index products_organization_id_idx on products (organization_id);
create index products_code_idx on products (code);
create index products_status_idx on products (status);
create index products_current_stock_idx on products (current_stock);

create index stock_ins_organization_id_idx on stock_ins (organization_id);
create index stock_ins_branch_id_idx on stock_ins (branch_id);
create index stock_ins_product_id_idx on stock_ins (product_id);
create index stock_ins_created_at_idx on stock_ins (created_at);

create index sales_organization_id_idx on sales (organization_id);
create index sales_branch_id_idx on sales (branch_id);
create index sales_invoice_number_idx on sales (invoice_number);
create index sales_created_at_idx on sales (created_at);

create index sale_items_organization_id_idx on sale_items (organization_id);
create index sale_items_branch_id_idx on sale_items (branch_id);
create index sale_items_sale_id_idx on sale_items (sale_id);
create index sale_items_product_id_idx on sale_items (product_id);
create index sale_items_created_at_idx on sale_items (created_at);

create index audit_logs_organization_id_idx on audit_logs (organization_id);
create index audit_logs_branch_id_idx on audit_logs (branch_id);
create index audit_logs_created_at_idx on audit_logs (created_at);
