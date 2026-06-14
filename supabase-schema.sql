create table if not exists public.inventory_items (
  shop_code text not null,
  id text not null,
  name text not null,
  amount integer not null default 0,
  price integer not null default 0,
  image text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (shop_code, id)
);

create index if not exists inventory_items_shop_code_sort_order_idx
  on public.inventory_items (shop_code, sort_order);
