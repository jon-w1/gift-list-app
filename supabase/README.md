# supabase/

`migrations/` is applied automatically to the live Supabase project by the
Supabase GitHub integration ("Deploy to production") on every push to `main`.

- Add changes as new numbered files: `0003_short_name.sql`, `0004_…`.
- Never edit a migration that has already been applied; it won't re-run.
- Every migration must be safe on a database that already holds family data.
- Run the privacy tests in `../tests/db/` before pushing schema changes.
- Don't add `config.toml` here without checking what it would push to the
  live project's auth settings (email templates, SMTP, site URL).
