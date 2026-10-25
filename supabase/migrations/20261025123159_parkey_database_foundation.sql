-- ADI-173: database foundation only; no client policies or booking RPCs.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema parkey_private;
revoke all on schema parkey_private from public, anon, authenticated;

create type public.verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type public.operator_staff_role as enum ('owner', 'staff');
create type public.inventory_unit_kind as enum ('dedicated_space', 'capacity_unit');
create type public.reservation_status as enum (
  'held', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show'
);

-- Profiles represent people, not authorization roles. One person may drive and
-- work for an operator. Administrator grants are intentionally deferred to ADI-174.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (btrim(display_name) <> ''),
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete restrict,
  registration_country text not null check (registration_country ~ '^[A-Z]{2}$'),
  -- Canonical uppercase letters/digits; formatting is a future input concern.
  plate_number text not null check (plate_number ~ '^[A-Z0-9]+$'),
  created_at timestamptz not null default now(),
  unique (driver_id, registration_country, plate_number),
  unique (id, driver_id)
);

create table public.parking_operators (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  verification_status public.verification_status not null default 'pending',
  verification_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint operator_verified_evidence check (
    verification_status <> 'verified' or (
      verified_at is not null and isfinite(verified_at)
      and nullif(btrim(verification_reference), '') is not null
    )
  )
);

create table public.operator_staff (
  operator_id uuid not null references public.parking_operators (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  role public.operator_staff_role not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (operator_id, profile_id),
  check (revoked_at is null or (isfinite(revoked_at) and revoked_at >= created_at))
);
create index operator_staff_profile_idx on public.operator_staff (profile_id);

create table public.parking_locations (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.parking_operators (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  address text not null check (btrim(address) <> ''),
  position extensions.geography(Point, 4326) not null,
  -- Weekly hours are wall-clock Asia/Manila times, not UTC times.
  time_zone text not null default 'Asia/Manila' check (time_zone = 'Asia/Manila'),
  verification_status public.verification_status not null default 'pending',
  authorization_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint location_verified_authorization check (
    verification_status <> 'verified' or (
      verified_at is not null and isfinite(verified_at)
      and nullif(btrim(authorization_reference), '') is not null
    )
  ),
  constraint location_position_not_empty check (not extensions.st_isempty(position::extensions.geometry))
);
create index parking_locations_operator_idx on public.parking_locations (operator_id);
create index parking_locations_position_idx on public.parking_locations using gist (position);

-- Each row is ONE enforceable Parkey commitment, never the facility's capacity.
-- A capacity_unit is a logical allocation token, not necessarily a marked bay.
create table public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.parking_locations (id) on delete restrict,
  label text not null check (btrim(label) <> ''),
  kind public.inventory_unit_kind not null,
  is_committed boolean not null default false,
  commitment_reference text,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (location_id, label),
  unique (id, location_id),
  constraint inventory_commitment_evidence check (
    not is_committed or (
      committed_at is not null and isfinite(committed_at)
      and nullif(btrim(commitment_reference), '') is not null
    )
  )
);

create table public.operating_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.parking_locations (id) on delete restrict,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  -- Overnight windows must be split at midnight into separate weekdays.
  check (opens_at < closes_at),
  unique (location_id, iso_weekday, opens_at),
  constraint operating_hours_no_overlap exclude using gist (
    location_id extensions.gist_uuid_ops with =,
    iso_weekday extensions.gist_int2_ops with =,
    (numrange(extract(epoch from opens_at), extract(epoch from closes_at), '[)')) with &&
  )
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.parking_locations (id) on delete restrict,
  -- NULL blocks the entire location; otherwise the unit must belong to it.
  inventory_unit_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (btrim(reason) <> ''),
  created_at timestamptz not null default now(),
  foreign key (inventory_unit_id, location_id)
    references public.inventory_units (id, location_id) on delete restrict,
  check (isfinite(starts_at) and isfinite(ends_at) and starts_at < ends_at)
);
create index availability_blocks_location_period_idx on public.availability_blocks
  using gist (location_id extensions.gist_uuid_ops, tstzrange(starts_at, ends_at, '[)'));
create index availability_blocks_unit_idx on public.availability_blocks (inventory_unit_id, location_id);

-- Holds live in the same table as confirmed reservations so the exclusion
-- constraint protects both, including simultaneous transactions.
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete restrict,
  vehicle_id uuid not null,
  inventory_unit_id uuid not null references public.inventory_units (id) on delete restrict,
  idempotency_key uuid not null,
  status public.reservation_status not null default 'held',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hold_expires_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, driver_id) references public.vehicles (id, driver_id) on delete restrict,
  unique (driver_id, idempotency_key),
  check (isfinite(starts_at) and isfinite(ends_at) and starts_at < ends_at),
  check (hold_expires_at is null or (isfinite(hold_expires_at) and hold_expires_at > created_at)),
  check (status <> 'held' or hold_expires_at is not null),
  constraint reservations_no_active_overlap exclude using gist (
    inventory_unit_id extensions.gist_uuid_ops with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('held', 'confirmed', 'checked_in'))
);
create index reservations_vehicle_driver_idx on public.reservations (vehicle_id, driver_id);
-- A nonpartial FK index also covers historical reservations.
create index reservations_unit_idx on public.reservations (inventory_unit_id);
create index reservations_hold_expiry_idx on public.reservations (hold_expires_at) where status = 'held';

create table public.reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  previous_status public.reservation_status,
  status public.reservation_status not null,
  actor_id uuid references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  check (previous_status is null or previous_status <> status)
);
create index reservation_events_reservation_idx on public.reservation_events (reservation_id, occurred_at);
create index reservation_events_actor_idx on public.reservation_events (actor_id);

-- Reconciliation anchors only: no amounts, payment truth, checkout or webhooks.
create table public.payment_references (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  provider text not null check (btrim(provider) <> ''),
  external_reference text not null check (btrim(external_reference) <> ''),
  created_at timestamptz not null default now(),
  unique (provider, external_reference)
);
create index payment_references_reservation_idx on public.payment_references (reservation_id);

create table public.operational_incidents (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.parking_locations (id) on delete restrict,
  reservation_id uuid references public.reservations (id) on delete restrict,
  summary text not null check (btrim(summary) <> ''),
  reported_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- One subject; reservation incidents derive their location through inventory.
  check (num_nonnulls(location_id, reservation_id) = 1),
  check (resolved_at is null or (isfinite(resolved_at) and resolved_at >= created_at))
);
create index operational_incidents_location_idx on public.operational_incidents (location_id);
create index operational_incidents_reservation_idx on public.operational_incidents (reservation_id);
create index operational_incidents_reporter_idx on public.operational_incidents (reported_by);

-- Minimum eligibility guard, not an availability/booking engine. Row locks keep
-- concurrent verification/commitment updates from racing this admission check.
-- Existing reservations survive later suspension for explicit operational handling.
create function parkey_private.check_reservation_inventory()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  eligible boolean;
begin
  if new.status in ('held', 'confirmed', 'checked_in') then
    select u.is_committed and l.verification_status = 'verified' and o.verification_status = 'verified'
      into eligible
      from public.inventory_units u
      join public.parking_locations l on l.id = u.location_id
      join public.parking_operators o on o.id = l.operator_id
      where u.id = new.inventory_unit_id
      for share of o, l, u;
    if eligible is distinct from true then
      raise exception 'Active reservations require committed inventory at a verified location and operator'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger reservations_check_inventory
  before insert or update on public.reservations
  for each row execute function parkey_private.check_reservation_inventory();

create function parkey_private.record_reservation_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reservation_events (reservation_id, previous_status, status, actor_id)
      values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.reservation_events (reservation_id, previous_status, status, actor_id)
      values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger reservations_record_status
  after insert or update of status on public.reservations
  for each row execute function parkey_private.record_reservation_status();

create function parkey_private.reject_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Reservation events are append-only' using errcode = '23514';
end;
$$;
create trigger reservation_events_immutable
  before update or delete on public.reservation_events
  for each row execute function parkey_private.reject_event_mutation();

revoke all on all functions in schema parkey_private from public, anon, authenticated;

create trigger reservation_events_no_truncate
  before truncate on public.reservation_events
  for each statement execute function parkey_private.reject_event_mutation();

-- Explicit deny-by-default, independent of Supabase default table grants.
-- ADI-174 must introduce reviewed grants AND scoped policies together.
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.parking_operators enable row level security;
alter table public.operator_staff enable row level security;
alter table public.parking_locations enable row level security;
alter table public.inventory_units enable row level security;
alter table public.operating_hours enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_events enable row level security;
alter table public.payment_references enable row level security;
alter table public.operational_incidents enable row level security;

revoke all on table
  public.profiles, public.vehicles, public.parking_operators, public.operator_staff,
  public.parking_locations, public.inventory_units, public.operating_hours,
  public.availability_blocks, public.reservations, public.reservation_events,
  public.payment_references, public.operational_incidents
from public, anon, authenticated;
