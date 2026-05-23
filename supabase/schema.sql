-- ============================================================
-- RASC Snookerium Schema
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete restrict,
  table_number int not null check (table_number between 1 and 4),
  date date not null,
  start_time time not null,
  end_time time not null,
  type text not null check (type in ('regular', 'dnd')),
  drinks_amount numeric(10,2) not null default 0,
  carpark_amount numeric(10,2) not null default 0,
  table_fee numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'confirmed')),
  created_at timestamptz default now()
);

-- Index for fast daily grid lookups
create index if not exists sessions_date_table on sessions (date, table_number);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table members enable row level security;
alter table sessions enable row level security;

-- Anyone can read members (needed to show names on the booking grid)
create policy "members_read_all" on members
  for select using (true);

-- Anyone authenticated can read sessions (needed for the grid)
create policy "sessions_read_all" on sessions
  for select using (auth.role() = 'authenticated');

-- Members can insert sessions (member_id must match their own record)
create policy "sessions_insert_own" on sessions
  for insert with check (auth.role() = 'authenticated');

-- Members can update their own sessions only
create policy "sessions_update_own" on sessions
  for update using (auth.role() = 'authenticated');

-- ============================================================
-- Seed: 40 placeholder members
-- ============================================================

insert into members (phone, name, is_admin) values
  ('+6500000001', 'Member 01', false),
  ('+6500000002', 'Member 02', false),
  ('+6500000003', 'Member 03', false),
  ('+6500000004', 'Member 04', false),
  ('+6500000005', 'Member 05', false),
  ('+6500000006', 'Member 06', false),
  ('+6500000007', 'Member 07', false),
  ('+6500000008', 'Member 08', false),
  ('+6500000009', 'Member 09', false),
  ('+6500000010', 'Member 10', false),
  ('+6500000011', 'Member 11', false),
  ('+6500000012', 'Member 12', false),
  ('+6500000013', 'Member 13', false),
  ('+6500000014', 'Member 14', false),
  ('+6500000015', 'Member 15', false),
  ('+6500000016', 'Member 16', false),
  ('+6500000017', 'Member 17', false),
  ('+6500000018', 'Member 18', false),
  ('+6500000019', 'Member 19', false),
  ('+6500000020', 'Member 20', false),
  ('+6500000021', 'Member 21', false),
  ('+6500000022', 'Member 22', false),
  ('+6500000023', 'Member 23', false),
  ('+6500000024', 'Member 24', false),
  ('+6500000025', 'Member 25', false),
  ('+6500000026', 'Member 26', false),
  ('+6500000027', 'Member 27', false),
  ('+6500000028', 'Member 28', false),
  ('+6500000029', 'Member 29', false),
  ('+6500000030', 'Member 30', false),
  ('+6500000031', 'Member 31', false),
  ('+6500000032', 'Member 32', false),
  ('+6500000033', 'Member 33', false),
  ('+6500000034', 'Member 34', false),
  ('+6500000035', 'Member 35', false),
  ('+6500000036', 'Member 36', false),
  ('+6500000037', 'Member 37', false),
  ('+6500000038', 'Member 38', false),
  ('+6500000039', 'Member 39', false),
  ('+6500000040', 'Member 40', false)
on conflict (phone) do nothing;
