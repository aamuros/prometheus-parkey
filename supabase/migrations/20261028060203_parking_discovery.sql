-- Parkey V2: additive discovery model. Legacy ADI-173 tables/data remain untouched.
-- Public data only in these three tables. Review notes/reports stay private.
create table public.discovery_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('osm', 'parkey', 'community')),
  label text not null check (length(btrim(label)) between 1 and 200),
  url text check (url ~ '^https://'),
  license text not null check (length(btrim(license)) between 1 and 200),
  attribution text not null check (length(btrim(attribution)) between 1 and 500),
  imported_at timestamptz not null default now() check (isfinite(imported_at)),
  check (kind <> 'osm' or license = 'ODbL-1.0')
);

create function parkey_private.valid_discovery_geometry(value extensions.geometry)
returns boolean language sql immutable strict security invoker set search_path = ''
as $$
  select extensions.st_srid(value) = 4326
    and extensions.st_ndims(value) = 2
    and extensions.geometrytype(value) in ('POINT', 'LINESTRING')
    and not extensions.st_isempty(value) and extensions.st_isvalid(value)
    and extensions.st_xmin(extensions.box3d(value)) >= -180
    and extensions.st_xmax(extensions.box3d(value)) <= 180
    and extensions.st_ymin(extensions.box3d(value)) >= -85.051129
    and extensions.st_ymax(extensions.box3d(value)) <= 85.051129
    and (extensions.geometrytype(value) <> 'LINESTRING' or (
      extensions.st_npoints(value) between 2 and 500
      and extensions.st_length(value::extensions.geography) > 0
    ));
$$;
revoke all on function parkey_private.valid_discovery_geometry(extensions.geometry) from public, anon, authenticated;

create table public.discovery_parking (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.discovery_sources(id) on delete restrict,
  source_record_id text not null check (length(btrim(source_record_id)) between 1 and 200),
  source_url text check (source_url ~ '^https://'),
  source_updated_at timestamptz check (isfinite(source_updated_at)),
  name text not null check (length(btrim(name)) between 1 and 200),
  kind text not null check (kind in ('street', 'lot', 'garage')),
  geometry extensions.geometry(Geometry, 4326) not null,
  side text not null default 'unknown' check (side in ('left', 'right', 'both', 'unknown')),
  address text check (length(btrim(address)) between 1 and 500),
  -- Text retains exactly sourced fees/hours, including OSM conditional syntax.
  -- NULL means unknown, never free or open all day.
  fees text check (length(btrim(fees)) between 1 and 500),
  hours text check (length(btrim(hours)) between 1 and 500),
  verification text not null default 'unverified' check (verification in ('unverified', 'verified')),
  verified_at timestamptz check (isfinite(verified_at)),
  verification_url text check (verification_url ~ '^https://'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (source_id, source_record_id),
  constraint discovery_geometry_valid check (parkey_private.valid_discovery_geometry(geometry)),
  constraint discovery_geometry_kind check (
    (kind = 'street' and extensions.geometrytype(geometry) = 'LINESTRING') or
    (kind in ('lot', 'garage') and extensions.geometrytype(geometry) = 'POINT' and side = 'unknown')
  ),
  constraint discovery_verified_evidence check (
    (verification = 'unverified' and verified_at is null and verification_url is null) or
    (verification = 'verified' and verified_at is not null and verification_url is not null)
  ),
  constraint discovery_details_source_date check ((fees is null and hours is null) or source_updated_at is not null)
);
create index discovery_parking_geometry_idx on public.discovery_parking using gist (geometry) where published;
-- Geography index supports future nearest/ST_DWithin queries in meters.
create index discovery_parking_nearby_idx on public.discovery_parking using gist ((geometry::extensions.geography)) where published;

create table public.discovery_regulations (
  id uuid primary key default gen_random_uuid(),
  parking_id uuid not null references public.discovery_parking(id) on delete cascade,
  source_id uuid not null references public.discovery_sources(id) on delete restrict,
  description text not null check (length(btrim(description)) between 1 and 1000),
  source_url text check (source_url ~ '^https://'),
  observed_at timestamptz check (isfinite(observed_at)),
  published boolean not null default false
);
create index discovery_regulations_parking_idx on public.discovery_regulations (parking_id);
create index discovery_regulations_source_idx on public.discovery_regulations (source_id);

-- No public submission path is opened. A future trusted endpoint must enforce
-- captcha, server-side validation, rate limits, idempotency, and photo moderation.
create table parkey_private.community_reports (
  id uuid primary key default gen_random_uuid(),
  intent text not null check (intent in ('add', 'correction')),
  target_id uuid references public.discovery_parking(id) on delete restrict,
  external_target_url text check (external_target_url ~ '^https://www.openstreetmap.org/(node|way|relation)/[0-9]+$'),
  name text not null check (length(btrim(name)) between 3 and 100),
  kind text not null check (kind in ('street', 'lot', 'garage')),
  geometry extensions.geometry(Geometry, 4326) not null,
  side text not null default 'unknown' check (side in ('left', 'right', 'both', 'unknown')),
  restrictions text check (length(btrim(restrictions)) between 1 and 500),
  hours text check (length(btrim(hours)) between 1 and 500),
  fees text check (length(btrim(fees)) between 1 and 500),
  -- Future private storage path; no public photo bucket or anonymous uploads.
  photo_path text,
  status text not null default 'pending_review' check (status in ('pending_review', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz check (isfinite(reviewed_at)),
  check (parkey_private.valid_discovery_geometry(geometry)),
  check ((kind = 'street' and extensions.geometrytype(geometry) = 'LINESTRING'
      and extensions.st_length(geometry::extensions.geography) between 5 and 1000)
    or (kind in ('lot', 'garage') and extensions.geometrytype(geometry) = 'POINT' and side = 'unknown')),
  check ((intent = 'add' and target_id is null and external_target_url is null)
    or (intent = 'correction' and num_nonnulls(target_id, external_target_url) = 1 and restrictions is not null)),
  check ((status = 'pending_review' and reviewed_at is null)
    or (status <> 'pending_review' and reviewed_at is not null and reviewed_at >= created_at))
);
create index community_reports_target_idx on parkey_private.community_reports (target_id);
create index community_reports_pending_idx on parkey_private.community_reports (created_at) where status = 'pending_review';
alter table parkey_private.community_reports enable row level security;
revoke all on table parkey_private.community_reports from public, anon, authenticated;

alter table public.discovery_sources enable row level security;
alter table public.discovery_parking enable row level security;
alter table public.discovery_regulations enable row level security;
revoke all on table public.discovery_sources, public.discovery_parking, public.discovery_regulations from public, anon, authenticated;
grant select on table public.discovery_sources, public.discovery_parking, public.discovery_regulations to anon, authenticated;
-- Sources contain public attribution only. Internal evidence belongs in private storage.
create policy discovery_sources_read on public.discovery_sources for select to anon, authenticated using (true);
create policy discovery_parking_read on public.discovery_parking for select to anon, authenticated using (published);
create policy discovery_regulations_read on public.discovery_regulations for select to anon, authenticated
  using (published and exists (select 1 from public.discovery_parking p where p.id = parking_id and p.published));

create function public.discover_parking(west double precision, south double precision, east double precision, north double precision)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
declare result jsonb;
begin
  -- Limit cost and reject NaN/infinity, inverted bounds, and dateline crossings.
  if west is null or south is null or east is null or north is null
    or not (west >= -180 and east <= 180 and south >= -85.051129 and north <= 85.051129
      and west < east and south < north and east - west <= 0.5 and north - south <= 0.5) then
    raise exception 'Expected a viewport at most 0.5 degrees wide and high, without a dateline crossing' using errcode = '22023';
  end if;
  with candidates as materialized (
    select p.* from public.discovery_parking p
    where p.published and extensions.st_intersects(p.geometry, extensions.st_makeenvelope(west, south, east, north, 4326))
    order by p.id limit 251
  ), limited as (
    select * from candidates order by id limit 250
  )
  select jsonb_build_object(
    'truncated', (select count(*) > 250 from candidates),
    'records', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'kind', p.kind,
      'geometry', extensions.st_asgeojson(p.geometry)::jsonb,
      'address', p.address, 'side', p.side, 'fees', p.fees, 'hours', p.hours,
      'sourceKind', s.kind, 'sourceLabel', s.label, 'sourceUrl', p.source_url,
      'license', s.license, 'sourceUpdatedAt', p.source_updated_at,
      'verification', p.verification, 'verifiedAt', p.verified_at,
      'regulations', coalesce((select jsonb_agg(jsonb_build_object(
        'description', r.description, 'sourceLabel', rs.label, 'sourceUrl', r.source_url, 'observedAt', r.observed_at
      ) order by r.id) from public.discovery_regulations r join public.discovery_sources rs on rs.id = r.source_id
        where r.parking_id = p.id and r.published), '[]'::jsonb)
    ) order by p.id), '[]'::jsonb)
  ) into result from limited p join public.discovery_sources s on s.id = p.source_id;
  return result;
end;
$$;
revoke all on function public.discover_parking(double precision, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function public.discover_parking(double precision, double precision, double precision, double precision) to anon, authenticated;
