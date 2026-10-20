-- Channelora MVP schema. Run in Supabase SQL Editor or with Supabase CLI.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.reservation_status as enum ('confirmed','tentative','cancelled');
create type public.reservation_source_type as enum ('direct','ical','api','manual');
create type public.connection_status as enum ('pending','active','error','paused');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  address text,
  timezone text not null default 'America/Bogota',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_owner_idx on public.properties(owner_id);

create table public.channels (
  id text primary key,
  display_name text not null,
  integration_type text not null check (integration_type in ('ical','api','manual')),
  created_at timestamptz not null default now()
);
insert into public.channels(id,display_name,integration_type) values
 ('airbnb','Airbnb','ical'),('booking','Booking.com','ical'),('tripadvisor','Tripadvisor','manual'),
 ('vrbo','Vrbo / Expedia','ical'),('other','Otra plataforma','ical')
on conflict (id) do nothing;

create table public.channel_listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  channel_id text not null references public.channels(id),
  external_listing_id text,
  listing_name text,
  created_at timestamptz not null default now(),
  unique(property_id,channel_id,external_listing_id)
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  channel_id text not null references public.channels(id),
  direction text not null default 'import' check (direction in ('import','export','both')),
  source_url text,
  export_token_hash text,
  status public.connection_status not null default 'pending',
  last_synced_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  sync_interval_minutes integer not null default 30 check (sync_interval_minutes between 5 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendar_connections_property_idx on public.calendar_connections(property_id);
-- For production: do not store source_url in plaintext. Use a secret store or application-level encryption.

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_name text,
  check_in date not null,
  check_out date not null,
  status public.reservation_status not null default 'confirmed',
  source_type public.reservation_source_type not null default 'direct',
  source_name text,
  external_uid text,
  external_status text,
  connection_id uuid references public.calendar_connections(id) on delete set null,
  notes text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create unique index reservations_external_uid_unique
  on public.reservations(connection_id, external_uid)
  where external_uid is not null;
create index reservations_property_dates_idx on public.reservations(property_id,check_in,check_out);
alter table public.reservations add constraint reservations_no_confirmed_overlap
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status = 'confirmed')
  deferrable initially immediate;

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default 'manual' check (reason in ('manual','maintenance','owner_use','external_unclassified')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);
create index availability_blocks_dates_idx on public.availability_blocks(property_id,start_date,end_date);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','error')),
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  cancelled_count integer not null default 0,
  error_message text
);
create index sync_runs_connection_started_idx on public.sync_runs(connection_id,started_at desc);

create table public.reservation_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  event_type text not null,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.conflicts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_a_id uuid references public.reservations(id) on delete set null,
  reservation_b_id uuid references public.reservations(id) on delete set null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (end_date > start_date)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger connections_set_updated_at before update on public.calendar_connections for each row execute function public.set_updated_at();
create trigger reservations_set_updated_at before update on public.reservations for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- All direct booking writes go through this transaction-safe function.
create or replace function public.create_direct_reservation(
  p_property_id uuid,
  p_guest_name text,
  p_check_in date,
  p_check_out date,
  p_notes text default null
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_check_out <= p_check_in then raise exception 'La fecha de salida debe ser posterior a la entrada'; end if;
  if not exists (select 1 from public.properties p where p.id=p_property_id and p.owner_id=auth.uid() and p.status='active') then
    raise exception 'Alojamiento no encontrado o sin permisos';
  end if;
  if exists (
    select 1 from public.reservations r
    where r.property_id=p_property_id and r.status='confirmed'
      and daterange(r.check_in,r.check_out,'[)') && daterange(p_check_in,p_check_out,'[)')
  ) then raise exception 'Conflicto: ya existe una reserva confirmada en esas fechas'; end if;
  if exists (
    select 1 from public.availability_blocks b
    where b.property_id=p_property_id
      and daterange(b.start_date,b.end_date,'[)') && daterange(p_check_in,p_check_out,'[)')
  ) then raise exception 'Conflicto: las fechas están bloqueadas'; end if;
  insert into public.reservations(property_id,guest_name,check_in,check_out,status,source_type,source_name,notes)
  values(p_property_id,nullif(trim(p_guest_name),''),p_check_in,p_check_out,'confirmed','direct','Reserva directa',p_notes)
  returning id into new_id;
  insert into public.reservation_events(property_id,reservation_id,event_type,source,payload)
  values(p_property_id,new_id,'reservation_created','direct',jsonb_build_object('check_in',p_check_in,'check_out',p_check_out));
  return new_id;
end;
$$;

create or replace function public.get_owned_connection(p_connection_id uuid)
returns table(id uuid, property_id uuid, channel_id text, source_url text)
language sql security invoker set search_path=public,pg_temp as $$
  select c.id,c.property_id,c.channel_id,c.source_url
  from public.calendar_connections c join public.properties p on p.id=c.property_id
  where c.id=p_connection_id and p.owner_id=auth.uid()
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.channels enable row level security;
alter table public.channel_listings enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.reservations enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.sync_runs enable row level security;
alter table public.reservation_events enable row level security;
alter table public.conflicts enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "owners manage properties" on public.properties for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "channels readable" on public.channels for select to authenticated using (true);
create policy "owners manage listings" on public.channel_listings for all to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid())) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()));
create policy "owners manage connections" on public.calendar_connections for all to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid())) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()));
create policy "owners manage reservations" on public.reservations for all to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid())) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()));
create policy "owners manage blocks" on public.availability_blocks for all to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid())) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()));
create policy "owners read sync runs" on public.sync_runs for select to authenticated using (exists(select 1 from public.calendar_connections c join public.properties p on p.id=c.property_id where c.id=connection_id and p.owner_id=auth.uid()));
create policy "owners read events" on public.reservation_events for select to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()));
create policy "owners manage conflicts" on public.conflicts for all to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid())) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()));

-- Enable realtime on core tables. If already in publication, ignore duplicate errors.
do $$ begin
  alter publication supabase_realtime add table public.reservations;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.properties;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.availability_blocks;
exception when duplicate_object then null; when undefined_object then null;
end $$;
