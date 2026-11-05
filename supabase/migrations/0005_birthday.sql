-- Optional birthday on each person (real accounts and managed profiles).
-- Who can see it follows the existing people rules: you, people paired with you,
-- and for managed profiles their managers and anyone paired with a manager.
-- Who can set it follows people_update: yourself, or any manager of a managed profile.
alter table public.people add column if not exists birthday date
  check (birthday is null or birthday >= date '1900-01-01');
