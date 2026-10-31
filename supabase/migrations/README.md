# Database migrations

The foundation migration preserves the legacy reservation model. V2 adds an
independent discovery model without changing legacy tables or data. Read
[discovery schema](../../docs/database.md) and [legacy schema](../../docs/legacy-reservation-schema.md).

Create new migrations using `pnpm exec supabase migration new descriptive_name`.
Apply only to an authorized environment. For an existing local stack, use
`pnpm exec supabase migration up --local`, then `pnpm exec supabase test db --local`.
Tests roll back their fixtures and grants. Never reset valuable data or apply
local seed files to a hosted database. The two configured seed files separate
fictional legacy fixtures from the real, attributed, unverified OSM pilot data.

Public discovery reads require both SELECT grants and RLS. Public writes remain
revoked. Private reports have no client access. No secure submission endpoint is
implemented or implied by the migration.
