-- Dining hall opening hours.
--
-- One row per hall per day per service window. Halls with a split schedule
-- (60 Belvidere serves breakfast and dinner but no lunch) get one row per
-- window, distinguished by slot_index.
--
-- Populated by backend-folder/run-scrape.js, which must run from a residential
-- IP: DineOnCampus sits behind Cloudflare and blocks datacenter traffic.

create table if not exists hall_hours (
  id            uuid primary key default gen_random_uuid(),
  location_name text     not null,
  day_of_week   smallint not null check (day_of_week between 0 and 6),  -- 0 = Sunday
  slot_index    smallint not null default 0,
  opens_at      time,
  closes_at     time,
  closed        boolean  not null default false,
  fetched_at    timestamptz not null default now(),
  unique (location_name, day_of_week, slot_index)
);

create index if not exists idx_hall_hours_location on hall_hours(location_name);

alter table hall_hours enable row level security;

-- Opening hours are public information, so anon may read them.
-- Writes go through the service role key, which bypasses RLS.
drop policy if exists "public read hall_hours" on hall_hours;
create policy "public read hall_hours" on hall_hours for select using (true);
