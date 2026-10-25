# Edge Functions

No functions are implemented in this scaffold. Future privileged integrations,
such as payment creation and webhook verification, belong in a trusted server
runtime. Keep secrets out of shared contracts and client bundles.

From the repository root, after a function has been assigned and implemented:

```sh
pnpm exec supabase functions new function-name
pnpm exec supabase functions serve --env-file supabase/.env
```

Copy `.env.example` to `.env` in this directory only when needed. The CLI injects
its own Supabase runtime variables; do not redefine reserved `SUPABASE_` names in
the function environment file. Do not disable JWT verification as a shortcut.
