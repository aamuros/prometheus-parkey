# Database migrations

No application schema is included in ADI-172. PostgreSQL/PostGIS models and the
reservation engine start in ADI-173.

From the repository root, create a migration with:

```sh
pnpm exec supabase migration new descriptive_name
```

Review SQL before applying it locally. Never apply production migrations as part
of scaffolding. Future exposed tables require RLS and explicit access policies.
