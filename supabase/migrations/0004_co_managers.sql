-- Co-managers for managed profiles (kids etc.).
--
-- A managed person can have several managers (e.g. both parents). Any manager can
-- edit the wishlist, rename/delete the profile, and add or remove other managers
-- (but never the last one). Anyone paired with ANY manager can see and shop the list.
-- people.managed_by stays as "who created it"; person_managers is the source of truth.
-- Safe on live data: existing kids get their current manager as the first manager.

-- ─────────────────────────────────────────── table
create table public.person_managers (
  person_id  uuid not null references public.people(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  added_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (person_id, user_id)
);
create index on public.person_managers (user_id);

insert into public.person_managers (person_id, user_id, added_by)
select id, managed_by, managed_by from public.people where managed_by is not null
on conflict do nothing;

-- A kid must outlive its creator's account if someone else still manages it:
-- managed_by now goes to null instead of deleting the kid.
alter table public.people drop constraint people_account_or_managed;
alter table public.people add constraint people_account_or_managed
  check (user_id is null or managed_by is null);
alter table public.people drop constraint if exists people_managed_by_fkey;
alter table public.people add constraint people_managed_by_fkey
  foreign key (managed_by) references auth.users(id) on delete set null;

-- Lock trigger: managed_by may only be cleared (account deleted / creator removed as manager).
create or replace function public.people_lock_fields()
returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id
     or (new.managed_by is distinct from old.managed_by and new.managed_by is not null)
     or new.email is distinct from old.email then
    raise exception 'only display_name can be changed';
  end if;
  return new;
end $$;

-- ─────────────────────────────────────────── helpers
create or replace function public.is_manager(pid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and exists (select 1 from person_managers where person_id = pid and user_id = uid)
$$;

create or replace function public.manager_count(pid uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from person_managers where person_id = pid
$$;

create or replace function public.can_manage_person(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = pid and user_id = auth.uid())
      or public.is_manager(pid, auth.uid())
$$;

-- Real account: you or anyone paired with them. Managed profile: its managers and
-- anyone paired with any of its managers.
create or replace function public.can_view_person(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when p.user_id is not null then public.are_connected(auth.uid(), p.user_id)
      else exists (
        select 1 from person_managers m
        where m.person_id = p.id and public.are_connected(auth.uid(), m.user_id)
      )
    end
    from people p where p.id = pid
  ), false)
$$;

-- ─────────────────────────────────────────── triggers
-- Creating a managed person makes its creator the first manager.
create or replace function public.add_creator_as_manager()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.managed_by is not null then
    insert into person_managers (person_id, user_id, added_by)
    values (new.id, new.managed_by, new.managed_by) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger people_add_creator_manager after insert on public.people
  for each row execute function public.add_creator_as_manager();

-- When a manager goes away: clear the creator hint if it was them, and delete the
-- profile if nobody manages it any more (only possible via account deletion).
create or replace function public.after_manager_removed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update people set managed_by = null where id = old.person_id and managed_by = old.user_id;
  if not exists (select 1 from person_managers where person_id = old.person_id) then
    delete from people where id = old.person_id and user_id is null;
  end if;
  return old;
end $$;
create trigger person_managers_after_delete after delete on public.person_managers
  for each row execute function public.after_manager_removed();

-- ─────────────────────────────────────────── row level security
alter table public.person_managers enable row level security;

create policy managers_select on public.person_managers for select to authenticated
  using (public.can_view_person(person_id));
-- Any manager can add someone they're paired with, to a managed (not real) profile.
create policy managers_insert on public.person_managers for insert to authenticated
  with check (
    public.is_manager(person_id, auth.uid())
    and exists (select 1 from public.people where id = person_id and user_id is null)
    and public.are_connected(auth.uid(), user_id)
  );
-- Any manager can remove any manager (including themselves), but never the last one.
create policy managers_delete on public.person_managers for delete to authenticated
  using (public.is_manager(person_id, auth.uid()) and public.manager_count(person_id) > 1);

-- people: managers (not just the creator) can rename and delete the profile.
-- The direct managed_by check stays in select so INSERT … RETURNING works.
drop policy people_update on public.people;
create policy people_update on public.people for update to authenticated
  using (public.can_manage_person(id))
  with check (public.can_manage_person(id));
drop policy people_delete_managed on public.people;
create policy people_delete_managed on public.people for delete to authenticated
  using (user_id is null and public.is_manager(id, auth.uid()));

-- ─────────────────────────────────────────── grants
grant select, insert, delete on public.person_managers to authenticated;
grant execute on function public.is_manager(uuid, uuid), public.manager_count(uuid) to authenticated;
