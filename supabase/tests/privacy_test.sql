-- Privacy tests. Run against a scratch database (see README).
\set ON_ERROR_STOP 1
\set QUIET 1
create or replace function public.t_check(actual bigint, expected bigint, label text) returns void
language plpgsql as $$ begin
  if actual is distinct from expected then raise exception 'FAIL: % (got %, expected %)', label, actual, expected; end if;
  raise notice 'ok  %', label;
end $$;
create or replace function public.t_fails(stmt text, label text) returns void
language plpgsql as $$ begin
  begin execute stmt; exception when others then raise notice 'ok  % (blocked: %)', label, sqlerrm; return; end;
  raise exception 'FAIL: % — statement was allowed', label;
end $$;
grant execute on function public.t_check(bigint,bigint,text), public.t_fails(text,text) to authenticated;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'Jonathan@Example.com'),
 ('00000000-0000-0000-0000-00000000000b', 'wife@example.com'),
 ('00000000-0000-0000-0000-00000000000d', 'stranger@example.com');

select t_check((select count(*) from people), 3, 'sign-up creates a person row');
select set_config('test.wife', (select id::text from people where email='wife@example.com'), false);
select t_check((select count(*) from people where email = 'jonathan@example.com'), 1, 'emails stored lowercase');

-- ── Jonathan pairs with wife by email, and with mom before she has an account
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select t_check((select count(*) from json_each_text(connect_by_email(' WIFE@example.com ')) where key='status' and value='connected'), 1, 'pair by email (instant, case-insensitive)');
select t_check((select count(*) from json_each_text(connect_by_email('mom@example.com')) where key='status' and value='pending'), 1, 'pair by email before sign-up is pending');
select t_check((select count(*) from json_each_text(connect_by_email('jonathan@example.com')) where key='status' and value='self'), 1, 'cannot pair with yourself');
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'mom@example.com');
select t_check((select count(*) from connections where user_a='00000000-0000-0000-0000-00000000000a' and user_b='00000000-0000-0000-0000-00000000000c'), 1, 'pending pairing completes when mom signs up');

-- ── Stranger sees only themselves
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select t_check((select count(*) from people), 1, 'stranger sees only own person');

-- ── Wife adds a wish
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into items (id, person_id, kind, created_by, name, notes)
  select '10000000-0000-0000-0000-000000000001', id, 'wish', user_id, 'Cozy sweater', 'Size M, green' from people where user_id = auth.uid();
select t_fails($$insert into items (person_id, kind, created_by, name) select id, 'suggestion', user_id, 'x' from people where user_id = auth.uid()$$, 'recipient cannot add a suggestion for herself');
select t_fails($$insert into items (person_id, kind, created_by, name) select id, 'idea', user_id, 'x' from people where user_id = auth.uid()$$, 'recipient cannot add a private idea for herself');

-- ── Jonathan sees it, claims it, adds a suggestion + private idea for wife
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select t_check((select count(*) from items where kind='wish'), 1, 'paired person sees wishlist');
insert into claims (item_id, claimed_by) values ('10000000-0000-0000-0000-000000000001', auth.uid());
insert into items (id, person_id, kind, created_by, name) select '10000000-0000-0000-0000-000000000002', id, 'suggestion', '00000000-0000-0000-0000-00000000000a', 'Spa day' from people where email='wife@example.com';
insert into items (id, person_id, kind, created_by, name) select '10000000-0000-0000-0000-000000000003', id, 'idea', '00000000-0000-0000-0000-00000000000a', 'Anniversary trip' from people where email='wife@example.com';
select t_fails($$insert into items (person_id, kind, created_by, name) select id, 'wish', '00000000-0000-0000-0000-00000000000a', 'x' from people where email='wife@example.com'$$, 'cannot add to someone else''s own wishlist');
select t_fails($$insert into items (person_id, kind, created_by, name) values (current_setting('test.wife')::uuid, 'wish', auth.uid(), 'x')$$, 'cannot add to someone else''s wishlist (direct id)');
select t_fails($$update items set kind='wish' where id='10000000-0000-0000-0000-000000000002'$$, 'cannot turn a suggestion into a wish');

-- ── Wife: sees her wish, but no claims, no suggestions, no ideas
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select t_check((select count(*) from items), 1, 'recipient sees only her own wish (no suggestions/ideas)');
select t_check((select count(*) from claims), 0, 'RECIPIENT CANNOT SEE CLAIMS');
select t_check((select count(*) from claims where item_id='10000000-0000-0000-0000-000000000001'), 0, 'recipient cannot look up a claim by item id');
select t_fails($$insert into claims (item_id, claimed_by) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')$$, 'recipient cannot claim own item (and learns nothing)');
with u as (update claims set status='purchased' returning 1) select t_check((select count(*) from u), 0, 'recipient cannot modify claims');
with d as (delete from claims returning 1) select t_check((select count(*) from d), 0, 'recipient cannot delete claims');
select t_check((select count(*) from items where id='10000000-0000-0000-0000-000000000002'), 0, 'recipient cannot fetch a suggestion by id');

-- ── Mom joins wife via invite link
select t_check((select count(*) from (select my_invite_token()) t), 1, 'invite token issued');
reset role;
select set_config('test.token', (select token::text from invites where user_id='00000000-0000-0000-0000-00000000000b'), false);
set role anon;
select t_check((select count(*) from (select invite_preview(current_setting('test.token')::uuid) n) t where n = 'wife'), 1, 'invite preview works signed-out');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select t_check((select count(*) from json_each_text(accept_invite(current_setting('test.token')::uuid)) where key='status' and value='connected'), 1, 'accept invite');
select t_check((select count(*) from items), 2, 'mom sees wife''s wish + suggestion, not Jonathan''s private idea');
select t_check((select count(*) from claims), 1, 'mom sees the claim (avoids duplicates)');
insert into claims (item_id, claimed_by) values ('10000000-0000-0000-0000-000000000002', auth.uid());
select t_fails($$insert into claims (item_id, claimed_by) values ('10000000-0000-0000-0000-000000000003', auth.uid())$$, 'cannot claim someone else''s private idea');

-- ── Stranger sees nothing of wife's
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select t_check((select count(*) from items), 0, 'stranger sees no items');
select t_check((select count(*) from claims), 0, 'stranger sees no claims');
select t_fails($$insert into items (person_id, kind, created_by, name) values (current_setting('test.wife')::uuid, 'suggestion', auth.uid(), 'x')$$, 'stranger cannot add suggestions');
select t_fails($$insert into claims (item_id, claimed_by) values ('10000000-0000-0000-0000-000000000001', auth.uid())$$, 'stranger cannot claim');

-- ── Managed kid
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into people (id, managed_by, display_name) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'Kid') returning id;
insert into items (id, person_id, kind, created_by, name) values ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'wish', auth.uid(), 'Lego set');
select t_fails($$insert into people (user_id, display_name) values ('00000000-0000-0000-0000-00000000000d', 'Fake')$$, 'cannot create a person for another account');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select t_check((select count(*) from people where id='20000000-0000-0000-0000-000000000001'), 1, 'paired user sees managed kid');
insert into claims (item_id, claimed_by) values ('10000000-0000-0000-0000-000000000004', auth.uid());
select t_fails($$insert into items (person_id, kind, created_by, name) values ('20000000-0000-0000-0000-000000000001', 'wish', auth.uid(), 'x')$$, 'only the manager edits a kid''s wishlist');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select t_check((select count(*) from claims where item_id='10000000-0000-0000-0000-000000000004'), 1, 'manager sees claims on kid''s list');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select t_check((select count(*) from people where managed_by is not null), 0, 'stranger cannot see kid');

-- ── Unpairing and account deletion
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select remove_connection('00000000-0000-0000-0000-00000000000b');
select t_check((select count(*) from items where person_id=current_setting('test.wife')::uuid), 0, 'after unpairing, mom no longer sees wife''s items');
select t_check((select count(*) from claims where claimed_by=auth.uid()), 0, 'after unpairing, mom''s old claims on wife''s list are hidden too');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select delete_my_account();
reset role;
select t_check((select count(*) from auth.users where email='stranger@example.com'), 0, 'delete my account removes the login');
select t_check((select count(*) from people where email='stranger@example.com'), 0, 'delete my account removes their data');
\echo ALL PRIVACY TESTS PASSED
