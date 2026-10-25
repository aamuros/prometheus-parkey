-- Self-contained pgTAP tests. All test data and test-only grants roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002');
insert into public.profiles (id, display_name) values
  ('a0000000-0000-4000-8000-000000000001', 'FICTIONAL Test Driver One'),
  ('a0000000-0000-4000-8000-000000000002', 'FICTIONAL Test Driver Two');
insert into public.vehicles (id, driver_id, registration_country, plate_number) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'PH', 'TEST001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'PH', 'TEST002');
insert into public.parking_operators (id, name, verification_status, verification_reference, verified_at)
values ('a2000000-0000-4000-8000-000000000001', 'FICTIONAL Test Operator', 'verified', 'TEST-ONLY', now());
insert into public.operator_staff (operator_id, profile_id, role)
values ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'owner');
insert into public.parking_locations (
  id, operator_id, name, address, position, verification_status, authorization_reference, verified_at
) values
  ('a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
    'FICTIONAL Test Location', 'FICTIONAL address', st_point(121.03, 14.56, 4326)::geography,
    'verified', 'TEST-ONLY', now()),
  ('a3000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001',
    'FICTIONAL Pending Location', 'FICTIONAL address', st_point(121.031, 14.561, 4326)::geography,
    'pending', null, null);
insert into public.inventory_units (
  id, location_id, label, kind, is_committed, commitment_reference, committed_at
) values
  ('a4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001',
    'TEST-BAY', 'dedicated_space', true, 'TEST-ONLY', now()),
  ('a4000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001',
    'TEST-CAPACITY', 'capacity_unit', true, 'TEST-ONLY', now()),
  ('a4000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000001',
    'TEST-UNCOMMITTED', 'dedicated_space', false, null, null),
  ('a4000000-0000-4000-8000-000000000004', 'a3000000-0000-4000-8000-000000000002',
    'TEST-PENDING-LOCATION', 'capacity_unit', true, 'TEST-ONLY', now());

-- A helper keeps failure cases focused on one changed input. It is temporary,
-- invoker-only, and never part of the application migration.
create function pg_temp.reserve(
  unit_id uuid default 'a4000000-0000-4000-8000-000000000001',
  reservation_state public.reservation_status default 'held',
  begins timestamptz default '2099-01-01T00:00:00Z',
  finishes timestamptz default '2099-01-01T01:00:00Z',
  deadline timestamptz default '2098-12-31T23:59:00Z',
  driver uuid default 'a0000000-0000-4000-8000-000000000001',
  vehicle uuid default 'a1000000-0000-4000-8000-000000000001',
  request_key uuid default gen_random_uuid()
) returns uuid language sql as $$
  insert into public.reservations (
    driver_id, vehicle_id, inventory_unit_id, idempotency_key, status, starts_at, ends_at, hold_expires_at
  ) values (driver, vehicle, unit_id, request_key, reservation_state, begins, finishes, deadline)
  returning id;
$$;

select is((select st_srid(position::geometry) from public.parking_locations
  where id = 'a3000000-0000-4000-8000-000000000001'), 4326, 'Location uses WGS84');
select ok(exists (select 1 from pg_indexes where schemaname = 'public'
  and indexname = 'parking_locations_position_idx' and indexdef like '%USING gist%'), 'Spatial GiST index exists');
select throws_ok($$insert into public.profiles (id, display_name)
  values ('afffffff-0000-4000-8000-000000000001', 'Missing Auth User')$$,
  '23503', null, 'Profiles require an Auth identity');
select throws_ok($$insert into public.vehicles (driver_id, registration_country, plate_number)
  values ('a0000000-0000-4000-8000-000000000001', 'PH', 'TEST001')$$,
  '23505', null, 'Duplicate driver vehicle registration is rejected');
select throws_ok($$insert into public.vehicles (driver_id, registration_country, plate_number)
  values ('a0000000-0000-4000-8000-000000000001', 'PH', 'test 001')$$,
  '23514', null, 'Plate numbers must be canonical');
select throws_ok($$insert into public.operator_staff (operator_id, profile_id, role)
  values ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'staff')$$,
  '23505', null, 'Duplicate staff membership is rejected');
select throws_ok($$update public.parking_operators set verification_reference = null
  where id = 'a2000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'Verified operators require evidence');
select throws_ok($$update public.parking_locations set verification_status = 'verified'
  where id = 'a3000000-0000-4000-8000-000000000002'$$,
  '23514', null, 'Verified locations require authorization evidence');
select throws_ok($$update public.inventory_units set is_committed = true
  where id = 'a4000000-0000-4000-8000-000000000003'$$,
  '23514', null, 'Commitments require evidence');
select throws_ok($$insert into public.inventory_units (location_id, label, kind)
  values ('a3000000-0000-4000-8000-000000000001', 'TEST-BAY', 'dedicated_space')$$,
  '23505', null, 'Inventory labels are unique within a location');

select throws_ok($$select pg_temp.reserve(unit_id => 'a4000000-0000-4000-8000-000000000003')$$,
  '23514', null, 'Uncommitted inventory cannot accept active reservations');
select throws_ok($$select pg_temp.reserve(unit_id => 'a4000000-0000-4000-8000-000000000004')$$,
  '23514', null, 'Unverified locations cannot accept active reservations');
update public.parking_operators set verification_status = 'suspended'
where id = 'a2000000-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.reserve()$$, '23514', null, 'Suspended operators cannot accept active reservations');
update public.parking_operators set verification_status = 'verified'
where id = 'a2000000-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.reserve(vehicle => 'a1000000-0000-4000-8000-000000000002')$$,
  '23503', null, 'Driver cannot reserve with another driver vehicle');
select throws_ok($$select pg_temp.reserve(deadline => null)$$,
  '23514', null, 'Holds require an explicit deadline');
select throws_ok($$select pg_temp.reserve(deadline => '2000-01-01T00:00:00Z')$$,
  '23514', null, 'Hold deadline must follow creation');
select throws_ok($$select pg_temp.reserve(finishes => '2099-01-01T00:00:00Z')$$,
  '23514', null, 'Zero-length reservation is rejected');
select throws_ok($$select pg_temp.reserve(finishes => '2098-12-31T23:00:00Z')$$,
  '23514', null, 'Reversed reservation interval is rejected');
select throws_ok($$select pg_temp.reserve(finishes => 'infinity')$$,
  '23514', null, 'Infinite booking endpoints are rejected');

select lives_ok($$select pg_temp.reserve(request_key => 'a5000000-0000-4000-8000-000000000001')$$,
  'A valid hold is accepted');
select is((select count(*) from public.reservation_events e join public.reservations r on r.id = e.reservation_id
  where r.idempotency_key = 'a5000000-0000-4000-8000-000000000001' and e.previous_status is null
  and e.status = 'held'), 1::bigint, 'Creating a reservation records its initial status');
select throws_ok($$select pg_temp.reserve()$$,
  '23P01', null, 'An active hold excludes another hold');
select throws_ok($$select pg_temp.reserve(begins => '2099-01-01T00:30:00Z', finishes => '2099-01-01T01:30:00Z')$$,
  '23P01', null, 'Partially overlapping intervals are excluded');
select throws_ok($$select pg_temp.reserve(reservation_state => 'confirmed', deadline => null)$$,
  '23P01', null, 'A hold excludes an overlapping confirmation');
select throws_ok($$select pg_temp.reserve(reservation_state => 'checked_in', deadline => null)$$,
  '23P01', null, 'A hold excludes an overlapping check-in');
select lives_ok($$select pg_temp.reserve(unit_id => 'a4000000-0000-4000-8000-000000000002')$$,
  'A separate committed capacity unit can be reserved simultaneously');
select lives_ok($$select pg_temp.reserve(begins => '2099-01-01T01:00:00Z', finishes => '2099-01-01T02:00:00Z')$$,
  'Half-open ranges allow adjacent bookings');
select throws_ok($$select pg_temp.reserve(begins => '2099-01-02T00:00:00Z', finishes => '2099-01-02T01:00:00Z',
  request_key => 'a5000000-0000-4000-8000-000000000001')$$,
  '23505', null, 'A driver request key cannot be reused');

update public.reservations set status = 'cancelled'
where idempotency_key = 'a5000000-0000-4000-8000-000000000001';
select is((select count(*) from public.reservation_events e join public.reservations r on r.id = e.reservation_id
  where r.idempotency_key = 'a5000000-0000-4000-8000-000000000001' and e.previous_status = 'held'
  and e.status = 'cancelled'), 1::bigint, 'A status update records previous and next state');
select lives_ok($$select pg_temp.reserve(reservation_state => 'confirmed', deadline => null)$$,
  'Cancellation releases the interval');
select throws_ok($$update public.reservations set status = 'confirmed'
  where idempotency_key = 'a5000000-0000-4000-8000-000000000001'$$,
  '23P01', null, 'Reactivation also enforces overlap exclusion');
select throws_ok($$update public.reservation_events set occurred_at = now()$$,
  '23514', null, 'Audit history cannot be rewritten');
select throws_ok($$delete from public.reservation_events$$,
  '23514', null, 'Audit history cannot be deleted');
select throws_ok($$truncate public.reservation_events$$,
  '23514', null, 'Audit history cannot be truncated');
select throws_ok($$delete from public.reservations where idempotency_key = 'a5000000-0000-4000-8000-000000000001'$$,
  '23503', null, 'Reservation history prevents destructive reservation deletion');

select throws_ok($$select pg_temp.reserve()$$,
  '23P01', null, 'Confirmed reservations exclude new holds');
update public.reservations set status = 'checked_in'
where inventory_unit_id = 'a4000000-0000-4000-8000-000000000001'
  and starts_at = '2099-01-01T00:00:00Z' and status = 'confirmed';
select throws_ok($$select pg_temp.reserve()$$,
  '23P01', null, 'Checked-in reservations exclude new holds');
update public.reservations set status = 'completed'
where inventory_unit_id = 'a4000000-0000-4000-8000-000000000001'
  and starts_at = '2099-01-01T00:00:00Z' and status = 'checked_in';
select lives_ok($$select pg_temp.reserve()$$, 'Completed reservations release the interval');
select throws_ok($$update public.reservations set ends_at = '2099-01-01T01:30:00Z'
  where inventory_unit_id = 'a4000000-0000-4000-8000-000000000001'
  and starts_at = '2099-01-01T00:00:00Z' and status = 'held'$$,
  '23P01', null, 'Changing an active interval also enforces exclusion');

-- Time alone never changes an exclusion predicate: expiry must be explicit.
select lives_ok($$select pg_temp.reserve(begins => '2001-01-01T00:00:00Z', finishes => '2001-01-01T01:00:00Z')$$,
  'Foundation does not invent a rule against historical imports');
update public.reservations set created_at = '2000-01-01T00:00:00Z', hold_expires_at = '2000-01-01T00:05:00Z'
where starts_at = '2001-01-01T00:00:00Z';
select throws_ok($$select pg_temp.reserve(begins => '2001-01-01T00:00:00Z', finishes => '2001-01-01T01:00:00Z')$$,
  '23P01', null, 'Elapsed holds still block until explicitly expired');
update public.reservations set status = 'expired' where starts_at = '2001-01-01T00:00:00Z';
select lives_ok($$select pg_temp.reserve(begins => '2001-01-01T00:00:00Z', finishes => '2001-01-01T01:00:00Z')$$,
  'Explicit expiry releases the interval');

insert into public.operating_hours (location_id, iso_weekday, opens_at, closes_at)
values ('a3000000-0000-4000-8000-000000000001', 1, '08:00', '12:00');
select throws_ok($$insert into public.operating_hours (location_id, iso_weekday, opens_at, closes_at)
  values ('a3000000-0000-4000-8000-000000000001', 8, '08:00', '12:00')$$,
  '23514', null, 'ISO weekday must be 1 through 7');
select throws_ok($$insert into public.operating_hours (location_id, iso_weekday, opens_at, closes_at)
  values ('a3000000-0000-4000-8000-000000000001', 1, '11:00', '13:00')$$,
  '23P01', null, 'Operating windows cannot overlap');
select lives_ok($$insert into public.operating_hours (location_id, iso_weekday, opens_at, closes_at)
  values ('a3000000-0000-4000-8000-000000000001', 1, '12:00', '24:00')$$,
  'Adjacent hours and closing at midnight are supported');
select throws_ok($$insert into public.availability_blocks (location_id, inventory_unit_id, starts_at, ends_at, reason)
  values ('a3000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001',
    '2099-01-01T00:00:00Z', '2099-01-01T01:00:00Z', 'TEST')$$,
  '23503', null, 'A unit block cannot refer to another location');
select throws_ok($$insert into public.availability_blocks (location_id, starts_at, ends_at, reason)
  values ('a3000000-0000-4000-8000-000000000001', '2099-01-01T00:00:00Z', '2099-01-01T00:00:00Z', 'TEST')$$,
  '23514', null, 'Blocks must have a positive duration');
select lives_ok($$insert into public.availability_blocks (location_id, starts_at, ends_at, reason)
  values ('a3000000-0000-4000-8000-000000000001', '2099-01-02T00:00:00Z', '2099-01-02T01:00:00Z', 'TEST')$$,
  'A location-wide block does not require a unit');

insert into public.payment_references (reservation_id, provider, external_reference)
select id, 'fictional-provider', 'test-payment-1' from public.reservations
where idempotency_key = 'a5000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.payment_references (reservation_id, provider, external_reference)
  select id, 'fictional-provider', 'test-payment-1' from public.reservations
  where idempotency_key = 'a5000000-0000-4000-8000-000000000001'$$,
  '23505', null, 'A provider reference cannot reconcile against multiple records');
select throws_ok($$insert into public.operational_incidents (summary) values ('TEST')$$,
  '23514', null, 'Incidents require a subject');
select throws_ok($$insert into public.operational_incidents (location_id, reservation_id, summary)
  select 'a3000000-0000-4000-8000-000000000002', id, 'TEST' from public.reservations
  where idempotency_key = 'a5000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'Incident subject cannot be an unrelated location plus reservation');
select lives_ok($$insert into public.operational_incidents (location_id, summary)
  values ('a3000000-0000-4000-8000-000000000001', 'FICTIONAL test incident')$$,
  'Location incident is accepted');

-- Check every application table, even when Supabase default grants change.
create temporary table application_tables (name text primary key);
insert into application_tables values
  ('profiles'), ('vehicles'), ('parking_operators'), ('operator_staff'), ('parking_locations'),
  ('inventory_units'), ('operating_hours'), ('availability_blocks'), ('reservations'),
  ('reservation_events'), ('payment_references'), ('operational_incidents');
select ok(c.relrowsecurity, t.name || ' enables RLS') from application_tables t
join pg_class c on c.oid = ('public.' || t.name)::regclass;
select is((select count(*) from pg_policies p join application_tables t on p.tablename = t.name
  where p.schemaname = 'public'), 0::bigint, 'No application access policies exist');
select ok(not has_table_privilege(role_name, 'public.' || t.name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
  role_name || ' has no privileges on ' || t.name)
from application_tables t cross join (values ('anon'), ('authenticated')) roles(role_name);
select ok(not has_schema_privilege('anon', 'parkey_private', 'USAGE'), 'Private helper schema is unavailable to anon');
select ok(not has_schema_privilege('authenticated', 'parkey_private', 'USAGE'), 'Private helper schema is unavailable to authenticated');

select ok(not has_function_privilege(role_name, 'parkey_private.' || function_name || '()', 'EXECUTE'),
  role_name || ' cannot execute ' || function_name)
from (values ('anon'), ('authenticated')) roles(role_name)
cross join (values ('check_reservation_inventory'), ('record_reservation_status'), ('reject_event_mutation')) helpers(function_name);

-- Test RLS itself with temporary grants, rather than only table ACLs.
grant select, insert, update, delete on public.profiles to anon, authenticated;
set local role anon;
select is((select count(*) from public.profiles), 0::bigint, 'Anonymous reads see no profiles even with a table grant');
select throws_ok($$insert into public.profiles (id, display_name)
  values (gen_random_uuid(), 'Unauthorized')$$, '42501', null, 'Anonymous writes are blocked by RLS');
reset role;
set local role authenticated;
select is((select count(*) from public.profiles), 0::bigint, 'Authenticated reads see no profiles even with a table grant');
select throws_ok($$insert into public.profiles (id, display_name)
  values (gen_random_uuid(), 'Unauthorized')$$, '42501', null, 'Authenticated writes are blocked by RLS');
with changed as (update public.profiles set display_name = 'Unauthorized' returning id)
select is(count(*), 0::bigint, 'Authenticated updates cannot affect hidden profiles') from changed;
with removed as (delete from public.profiles returning id)
select is(count(*), 0::bigint, 'Authenticated deletes cannot affect hidden profiles') from removed;
reset role;

select * from finish();
rollback;
