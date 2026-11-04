-- Gift Lists — core schema
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
--
-- PRIVACY RULES (enforced here in the database, not just the UI):
--   * Wishlist items: visible to the person and everyone paired with them.
--   * Claims: visible to everyone who can see the item EXCEPT the recipient.
--   * Suggestions ("Mom would like this"): visible to everyone paired with the
--     recipient EXCEPT the recipient.
--   * Private ideas: visible only to the person who wrote them.
--   * Managed people (kids/grandparents without accounts) are run by a manager,
--     who counts as a gift-giver (sees claims + suggestions).

-- ─────────────────────────────────────────── people
create table public.people (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete cascade,
  managed_by   uuid references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  email        text unique,
  onboarded    boolean not null default false,   -- has picked a display name
  created_at   timestamptz not null default now(),
  -- exactly one of: a real account, or a profile managed by an account
  constraint people_account_or_managed check ((user_id is null) <> (managed_by is null))
);
create index on public.people (managed_by);

-- ─────────────────────────────────────────── connections (pairings, always mutual)
create table public.connections (
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint connections_ordered check (user_a < user_b)
);
create index on public.connections (user_b);

-- Email lookups for people who haven't signed up yet; converted on sign-up.
create table public.pending_connections (
  inviter    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  primary key (inviter, email)
);

-- One reusable invite link per user.
create table public.invites (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token   uuid not null unique default gen_random_uuid()
);

-- ─────────────────────────────────────────── items
create type public.item_kind as enum ('wish', 'idea', 'suggestion');

create table public.items (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.people(id) on delete cascade,
  kind       public.item_kind not null,
  created_by uuid not null references public.people(user_id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 200),
  notes      text check (char_length(notes) <= 4000),
  url        text check (url ~* '^https?://' and char_length(url) <= 2000),
  image_url  text check (image_url ~* '^https?://' and char_length(image_url) <= 2000),
  photo_path text check (char_length(photo_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.items (person_id);
create index on public.items (created_by);

-- ─────────────────────────────────────────── claims
create table public.claims (
  item_id    uuid primary key references public.items(id) on delete cascade,
  claimed_by uuid not null references public.people(user_id) on delete cascade,
  status     text not null default 'claimed' check (status in ('claimed', 'purchased')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.claims (claimed_by);

-- ─────────────────────────────────────────── helper functions
-- The account responsible for a person: themselves, or their manager.
create or replace function public.person_owner(pid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(user_id, managed_by) from people where id = pid
$$;

create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a is not null and b is not null and (
    a = b or exists (
      select 1 from connections
      where user_a = least(a, b) and user_b = greatest(a, b)
    )
  )
$$;

create or replace function public.can_view_person(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.are_connected(auth.uid(), public.person_owner(pid)), false)
$$;

create or replace function public.can_manage_person(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people
    where id = pid and (user_id = auth.uid() or managed_by = auth.uid())
  )
$$;

-- True only for the actual recipient (never for a manager).
create or replace function public.is_recipient(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = pid and user_id = auth.uid())
$$;

-- Can the current user see this item AND its claim status?
create or replace function public.can_see_claims(iid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from items i
    where i.id = iid
      and not public.is_recipient(i.person_id)
      and (
        (i.kind = 'idea' and i.created_by = auth.uid())
        or (i.kind in ('wish', 'suggestion') and public.can_view_person(i.person_id))
      )
  )
$$;

-- ─────────────────────────────────────────── triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();
create trigger claims_touch before update on public.claims
  for each row execute function public.touch_updated_at();

-- Fields that must never change after insert.
create or replace function public.items_lock_fields()
returns trigger language plpgsql as $$
begin
  if new.person_id <> old.person_id or new.kind <> old.kind or new.created_by <> old.created_by then
    raise exception 'person, kind and creator cannot be changed';
  end if;
  return new;
end $$;
create trigger items_lock before update on public.items
  for each row execute function public.items_lock_fields();

create or replace function public.claims_lock_fields()
returns trigger language plpgsql as $$
begin
  if new.item_id <> old.item_id or new.claimed_by <> old.claimed_by then
    raise exception 'claim item and claimer cannot be changed';
  end if;
  return new;
end $$;
create trigger claims_lock before update on public.claims
  for each row execute function public.claims_lock_fields();

create or replace function public.people_lock_fields()
returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id
     or new.managed_by is distinct from old.managed_by
     or new.email is distinct from old.email then
    raise exception 'only display_name can be changed';
  end if;
  return new;
end $$;
create trigger people_lock before update on public.people
  for each row execute function public.people_lock_fields();

-- New sign-up → create their person row and turn pending email lookups into pairings.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare e text := lower(btrim(new.email));
begin
  insert into people (user_id, display_name, email)
  values (new.id, left(coalesce(nullif(split_part(e, '@', 1), ''), 'Me'), 60), e);

  insert into connections (user_a, user_b)
  select least(pc.inviter, new.id), greatest(pc.inviter, new.id)
  from pending_connections pc
  where pc.email = e and pc.inviter <> new.id
  on conflict do nothing;

  delete from pending_connections where email = e;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────── RPCs (called from the app)
-- Pair with someone by email. Instant if they have an account; otherwise
-- remembered and paired automatically when they sign up.
create or replace function public.connect_by_email(target_email text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e  text := lower(btrim(target_email));
  other people%rowtype;
begin
  if me is null then raise exception 'not signed in'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('status', 'invalid');
  end if;

  select * into other from people where email = e and user_id is not null;
  if not found then
    insert into pending_connections (inviter, email) values (me, e) on conflict do nothing;
    return json_build_object('status', 'pending');
  end if;
  if other.user_id = me then
    return json_build_object('status', 'self');
  end if;

  insert into connections (user_a, user_b)
  values (least(me, other.user_id), greatest(me, other.user_id))
  on conflict do nothing;
  return json_build_object('status', 'connected', 'name', other.display_name, 'person_id', other.id);
end $$;

create or replace function public.my_invite_token()
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into invites (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select token into t from invites where user_id = auth.uid();
  return t;
end $$;

-- Who sent this invite? (Works before signing in, shows only a first name.)
create or replace function public.invite_preview(invite_token uuid)
returns text language sql stable security definer set search_path = public as $$
  select p.display_name from invites i join people p on p.user_id = i.user_id
  where i.token = invite_token
$$;

create or replace function public.accept_invite(invite_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inviter uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select user_id into inviter from invites where token = invite_token;
  if inviter is null then return json_build_object('status', 'invalid'); end if;
  if inviter = me then return json_build_object('status', 'self'); end if;
  insert into connections (user_a, user_b)
  values (least(me, inviter), greatest(me, inviter)) on conflict do nothing;
  return json_build_object('status', 'connected',
    'person_id', (select id from people where user_id = inviter));
end $$;

create or replace function public.remove_connection(other_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from connections
  where user_a = least(auth.uid(), other_user) and user_b = greatest(auth.uid(), other_user)
$$;

-- Required by the app stores; removes everything the user created.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Cheap query for the daily keep-alive ping (prevents free-tier pausing).
create or replace function public.ping()
returns text language sql stable as $$ select 'ok'::text $$;

-- ─────────────────────────────────────────── row level security
alter table public.people              enable row level security;
alter table public.connections         enable row level security;
alter table public.pending_connections enable row level security;
alter table public.invites             enable row level security;
alter table public.items               enable row level security;
alter table public.claims              enable row level security;

-- people
-- (direct column checks first so INSERT … RETURNING works for a just-created managed person)
create policy people_select on public.people for select to authenticated
  using (user_id = auth.uid() or managed_by = auth.uid() or public.can_view_person(id));
create policy people_insert_managed on public.people for insert to authenticated
  with check (managed_by = auth.uid() and user_id is null and email is null);
create policy people_update on public.people for update to authenticated
  using (user_id = auth.uid() or managed_by = auth.uid())
  with check (user_id = auth.uid() or managed_by = auth.uid());
create policy people_delete_managed on public.people for delete to authenticated
  using (managed_by = auth.uid());

-- connections (created only through RPCs)
create policy connections_select on public.connections for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy connections_delete on public.connections for delete to authenticated
  using (auth.uid() in (user_a, user_b));

-- pending_connections / invites: own rows only
create policy pending_select on public.pending_connections for select to authenticated
  using (inviter = auth.uid());
create policy pending_delete on public.pending_connections for delete to authenticated
  using (inviter = auth.uid());
create policy invites_select on public.invites for select to authenticated
  using (user_id = auth.uid());

-- items
create policy items_select on public.items for select to authenticated using (
  (kind = 'idea' and created_by = auth.uid())
  or (kind = 'wish' and public.can_view_person(person_id))
  or (kind = 'suggestion' and public.can_view_person(person_id) and not public.is_recipient(person_id))
);
create policy items_insert on public.items for insert to authenticated with check (
  created_by = auth.uid() and (
    (kind = 'wish' and public.can_manage_person(person_id))
    or (kind in ('idea', 'suggestion')
        and public.can_view_person(person_id)
        and not public.is_recipient(person_id))
  )
);
create policy items_update on public.items for update to authenticated
  using (created_by = auth.uid() or (kind = 'wish' and public.can_manage_person(person_id)))
  with check (created_by = auth.uid() or (kind = 'wish' and public.can_manage_person(person_id)));
create policy items_delete on public.items for delete to authenticated
  using (created_by = auth.uid() or (kind = 'wish' and public.can_manage_person(person_id)));

-- claims — the surprise-protection rules
create policy claims_select on public.claims for select to authenticated
  using (public.can_see_claims(item_id));
create policy claims_insert on public.claims for insert to authenticated
  with check (claimed_by = auth.uid() and public.can_see_claims(item_id));
create policy claims_update on public.claims for update to authenticated
  using (claimed_by = auth.uid()) with check (claimed_by = auth.uid());
create policy claims_delete on public.claims for delete to authenticated
  using (claimed_by = auth.uid());

-- ─────────────────────────────────────────── grants
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.connect_by_email(text) from public, anon;
revoke all on function public.accept_invite(uuid) from public, anon;
revoke all on function public.my_invite_token() from public, anon;
revoke all on function public.remove_connection(uuid) from public, anon;
grant execute on function public.delete_my_account(), public.connect_by_email(text),
  public.accept_invite(uuid), public.my_invite_token(), public.remove_connection(uuid)
  to authenticated;
grant execute on function public.invite_preview(uuid), public.ping() to anon, authenticated;

-- Explicit table/helper grants, so the app works even if the project has
-- "automatically expose new tables" turned off. Row-level security above
-- still decides which rows each person can see or change.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.people, public.connections,
  public.pending_connections, public.invites, public.items, public.claims
  to authenticated;
grant execute on function public.person_owner(uuid), public.are_connected(uuid, uuid),
  public.can_view_person(uuid), public.can_manage_person(uuid),
  public.is_recipient(uuid), public.can_see_claims(uuid)
  to authenticated;
