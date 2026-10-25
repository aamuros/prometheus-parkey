-- LOCAL DEVELOPMENT ONLY. Every organization, address, approval reference and
-- inventory commitment below is fictional. Coordinates are illustrative points
-- around Poblacion, Makati; they do not identify authorized parking facilities.
-- No auth users, credentials, real customer data, reservations or payments.
begin;

insert into public.parking_operators (id, name, verification_status, verification_reference, verified_at)
values
  ('10000000-0000-4000-8000-000000000001', 'FICTIONAL — Parkey Pilot Demo Operator',
    'verified', 'FICTIONAL-OPERATOR-REVIEW-ONLY', '2026-10-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', 'FICTIONAL — Pending Demo Operator',
    'pending', null, null);

insert into public.parking_locations (
  id, operator_id, name, address, position, verification_status, authorization_reference, verified_at
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    'FICTIONAL — Poblacion Demo Parking', 'Fictional training address, Poblacion, Makati, Philippines',
    extensions.st_setsrid(extensions.st_makepoint(121.0305, 14.5650), 4326)::extensions.geography,
    'verified', 'FICTIONAL-LOCATION-AUTHORIZATION-ONLY', '2026-10-01T00:00:00Z'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
    'FICTIONAL — Unverified Demo Parking', 'Fictional training address, Makati, Philippines',
    extensions.st_setsrid(extensions.st_makepoint(121.0310, 14.5655), 4326)::extensions.geography,
    'pending', null, null);

insert into public.inventory_units (
  id, location_id, label, kind, is_committed, commitment_reference, committed_at
) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
    'DEMO-BAY-A', 'dedicated_space', true, 'FICTIONAL-DEDICATED-BAY-COMMITMENT', '2026-10-01T00:00:00Z'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
    'DEMO-CAPACITY-1', 'capacity_unit', true, 'FICTIONAL-CAPACITY-COMMITMENT', '2026-10-01T00:00:00Z'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
    'DEMO-NOT-COMMITTED', 'dedicated_space', false, null, null);

-- Monday–Friday 08:00–18:00 Asia/Manila, for demonstration only.
insert into public.operating_hours (location_id, iso_weekday, opens_at, closes_at)
select '20000000-0000-4000-8000-000000000001'::uuid, weekday, '08:00'::time, '18:00'::time
from generate_series(1, 5) as weekday;

insert into public.availability_blocks (location_id, starts_at, ends_at, reason)
values ('20000000-0000-4000-8000-000000000001', '2030-01-07T00:00:00Z', '2030-01-07T02:00:00Z',
  'FICTIONAL — maintenance example; not live availability');

commit;
