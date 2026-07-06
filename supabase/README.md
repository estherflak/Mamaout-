# Supabase SQL

There is no migration tool or state table — every file here is applied **manually**
(Supabase dashboard → SQL Editor, or via the Supabase MCP). All of them have already
been run against the production project; keep them as the authoritative history of
how the schema evolved.

## Files

- `schema.sql` — the original schema ("v1"). Setting up a fresh project starts here.
- `migrations/migration_v2.sql` … `migration_v17.sql` — incremental changes, in
  numeric order. Written to be idempotent (safe to re-run) unless noted inside.
  - `migration_v10b_auto_profile_trigger.sql` is a numbering-collision oddity: it
    was also titled "v10" when written (2026-06-23) but postdates the
    saved-searches `migration_v10.sql` (2026-06-12). Apply order: v10 → v11 →
    … it can be applied at any point after v6 (needs `profiles`).
- `cleanup_v1.sql`, `clear_bad_coords.sql` — **one-off data repair scripts**, not
  schema migrations. Already run; kept for reference. Review every statement
  before ever re-running them.

## Setting up a fresh database

Run `schema.sql`, then each `migrations/*.sql` in ascending version order
(v10b right after v10). Some migrations note in their header comment the exact
name they were applied under in production.
