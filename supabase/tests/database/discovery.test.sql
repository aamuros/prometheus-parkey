-- Discovery geometry, RLS, RPC, and no-write tests. Everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
insert into public.discovery_sources (id,kind,label,license,attribution) values
 ('d1000000-0000-4000-8000-000000000001','parkey','Test source','Test only','Test attribution');
insert into public.discovery_parking (id,source_id,source_record_id,name,kind,geometry,published) values
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','test-lot','Test lot','lot',st_point(121.03,14.56,4326),true),
 ('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','test-private','Hidden review','lot',st_point(121.03,14.56,4326),false),
 ('d2000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000001','test-line','Crossing street','street',st_geomfromtext('LINESTRING(121.02 14.56,121.05 14.56)',4326),true);
insert into public.discovery_regulations (parking_id,source_id,description,published) values
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Published rule',true),
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Hidden rule',false),
 ('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','Rule for hidden parking',true);

select ok(parkey_private.valid_discovery_geometry(st_point(121.03,14.56,4326)), 'valid WGS84 point');
select ok(not parkey_private.valid_discovery_geometry(st_point(181,14,4326)), 'reject out-of-range longitude');
select ok(not parkey_private.valid_discovery_geometry(st_point(121,90,4326)), 'reject outside map latitude');
select ok(not parkey_private.valid_discovery_geometry(st_geomfromtext('POINT EMPTY',4326)), 'reject empty geometry');
select ok(not parkey_private.valid_discovery_geometry(st_geomfromtext('LINESTRING(121 14,121 14)',4326)), 'reject zero-length street');
select throws_like($$insert into public.discovery_parking (source_id,source_record_id,name,kind,geometry)
 values ('d1000000-0000-4000-8000-000000000001','wrong-kind','Invalid','street',st_point(121.03,14.56,4326))$$,
 '%discovery_geometry_kind%', 'street parking requires a line');
select throws_like($$update public.discovery_parking set verification='verified' where id='d2000000-0000-4000-8000-000000000001'$$,
 '%discovery_verified_evidence%', 'verification needs date and evidence');
select throws_like($$update public.discovery_parking set fees='Free' where id='d2000000-0000-4000-8000-000000000001'$$,
 '%discovery_details_source_date%', 'fees need a source date');
select throws_like($$select public.discover_parking(120,14,122,15)$$, '%viewport at most%', 'reject expensive viewport');
select throws_like($$select public.discover_parking('NaN'::float8,14,121,15)$$, '%viewport at most%', 'reject NaN viewport');
select throws_like($$select public.discover_parking(121,null,121.01,14.01)$$, '%viewport at most%', 'reject null viewport');
select throws_like($$select public.discover_parking(121.04,14.55,121.02,14.57)$$, '%viewport at most%', 'reject inverted viewport');
select throws_like($$insert into parkey_private.community_reports (intent,name,kind,geometry)
 values ('correction','Test correction','lot',st_point(121.03,14.56,4326))$$, '%check%', 'corrections need target and description');
select lives_ok($$insert into parkey_private.community_reports (intent,name,kind,geometry)
 values ('add','Test contribution','lot',st_point(121.03,14.56,4326))$$, 'trusted report starts pending');
select is((select status from parkey_private.community_reports limit 1), 'pending_review', 'report is not verified or published');

select ok(not has_table_privilege(role_name, 'public.' || table_name, operation), role_name || ' has no ' || operation || ' on ' || table_name)
from unnest(array['anon','authenticated']) role_name
cross join unnest(array['discovery_sources','discovery_parking','discovery_regulations']) table_name
cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) operation;
select ok(not has_schema_privilege(role_name,'parkey_private','USAGE'), role_name || ' cannot access reports schema')
from unnest(array['anon','authenticated']) role_name;

-- Invoke through actual client roles: RLS must apply inside the invoker RPC.
set local role anon;
select is((select count(*)::integer from public.discovery_parking where source_id='d1000000-0000-4000-8000-000000000001'),2,'anon sees published records only');
select is((select count(*)::integer from public.discovery_regulations where source_id='d1000000-0000-4000-8000-000000000001'),1,'anon cannot read hidden rules or hidden parent');
select is((select count(*)::integer from jsonb_array_elements(public.discover_parking(121.029,14.559,121.032,14.562)->'records') r where r->>'sourceLabel'='Test source'),2,'anonymous viewport finds a point and crossing street');
select is(jsonb_array_length(public.discover_parking(120.01,14.01,120.02,14.02)->'records'),0,'empty viewport returns empty records');
select throws_like($$insert into public.discovery_sources(kind,label,license,attribution) values('community','Anonymous','None','None')$$,'%permission denied%','anon cannot write public records');
select throws_like($$select * from parkey_private.community_reports$$,'%permission denied%','anon cannot read reports');
reset role;
set local role authenticated;
select is((select count(*)::integer from public.discovery_parking where source_id='d1000000-0000-4000-8000-000000000001'),2,'authenticated sees published only');
select is((select count(*)::integer from public.discovery_regulations where source_id='d1000000-0000-4000-8000-000000000001'),1,'authenticated cannot read hidden rules');
select throws_like($$delete from public.discovery_parking$$,'%permission denied%','authenticated cannot delete public records');
select throws_like($$select * from parkey_private.community_reports$$,'%permission denied%','authenticated cannot read reports');
reset role;

-- A dense viewport is bounded and explicitly marked as truncated.
insert into public.discovery_parking(source_id,source_record_id,name,kind,geometry,published)
select 'd1000000-0000-4000-8000-000000000001', 'dense-'||i,'Dense point','lot',st_point(121.031,14.561,4326),true from generate_series(1,251) i;
set local role anon;
select is(jsonb_array_length(public.discover_parking(121.029,14.559,121.032,14.562)->'records'),250,'RPC caps output at 250');
select is(public.discover_parking(121.029,14.559,121.032,14.562)->>'truncated','true','RPC signals truncation');
reset role;
select * from finish();
rollback;
