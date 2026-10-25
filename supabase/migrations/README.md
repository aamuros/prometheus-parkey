# Database migrations

ADI-173 introduces the initial PostgreSQL/PostGIS foundation. Read
[database design](../../docs/database.md) for entities, assumptions, constraints,
security boundaries and work deferred to ADI-174/ADI-185.

From the repository root, create subsequent migrations with the pinned CLI:

```sh
pnpm exec supabase migration new descriptive_name
```

With the Docker daemon running, verify against the disposable local stack:

```sh
pnpm supabase:start
# Destructive to local database data only; reapplies migrations and fictional seed.
pnpm exec supabase db reset --local
pnpm exec supabase migration list --local
pnpm exec supabase test db --local
pnpm exec supabase db lint --local --schema public,parkey_private --fail-on error
```

See [local setup](../../docs/development.md#local-database-migrations-and-tests).
Application tables enable RLS without client policies/grants. Tests roll back
all their fixtures. `supabase/seed.sql` is local-only, explicitly fictional, and
contains no Auth users or credentials. Do not run remote commands or load seeds
into hosted databases. Applied/shared migrations must be followed by new migrations,
not edited in place.
