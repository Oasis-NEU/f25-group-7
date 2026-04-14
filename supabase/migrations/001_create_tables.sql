-- NU Rate-ON: Full schema
-- Run this in Supabase Dashboard → SQL Editor if your tables were deleted.

create table if not exists locations (
  id             uuid primary key default gen_random_uuid(),
  original_id    text,
  name           text,
  type           text,
  building_name  text,
  sort_order     integer,
  date           date
);

create table if not exists periods (
  id           uuid primary key default gen_random_uuid(),
  original_id  text,
  location_id  uuid references locations(id) on delete cascade,
  name         text,
  date         date
);

create table if not exists stations (
  id           uuid primary key default gen_random_uuid(),
  original_id  text,
  period_id    uuid references periods(id) on delete cascade,
  name         text,
  date         date
);

create table if not exists menu_items (
  id              uuid primary key default gen_random_uuid(),
  station_id      uuid references stations(id) on delete cascade,
  original_id     text,
  name            text,
  calories        integer,
  portion         text,
  date            date,
  is_vegetarian   boolean default false,
  is_vegan        boolean default false,
  is_high_protein boolean default false
);

create table if not exists nutrients (
  id             uuid primary key default gen_random_uuid(),
  menu_item_id   uuid references menu_items(id) on delete cascade,
  name           text,
  value          text,
  uom            text,
  value_numeric  numeric
);

create table if not exists steast_vs_iv (
  date    date primary key,
  steast  integer default 0,
  iv      integer default 0
);

-- Allow public (anon) read access on dining tables (no sensitive data)
alter table locations   enable row level security;
alter table periods     enable row level security;
alter table stations    enable row level security;
alter table menu_items  enable row level security;
alter table nutrients   enable row level security;
alter table steast_vs_iv enable row level security;

create policy "public read locations"   on locations   for select using (true);
create policy "public read periods"     on periods     for select using (true);
create policy "public read stations"    on stations    for select using (true);
create policy "public read menu_items"  on menu_items  for select using (true);
create policy "public read nutrients"   on nutrients   for select using (true);
create policy "public read votes"       on steast_vs_iv for select using (true);
create policy "public update votes"     on steast_vs_iv for update using (true);
create policy "public insert votes"     on steast_vs_iv for insert with check (true);

-- Indexes for the common date+name lookups
create index if not exists idx_locations_name_date   on locations(name, date);
create index if not exists idx_periods_loc_date      on periods(location_id, date);
create index if not exists idx_stations_period_date  on stations(period_id, date);
create index if not exists idx_items_station_date    on menu_items(station_id, date);
create index if not exists idx_nutrients_item        on nutrients(menu_item_id);
