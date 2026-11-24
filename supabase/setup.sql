create table attendees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null check (category in ('student','org','vip','doctor')),
  code text not null unique,
  checked_in_at timestamptz,
  created_at timestamptz default now()
);

alter table attendees enable row level security;

create policy "admin only" on attendees
  for all to authenticated
  using (true) with check (true);
