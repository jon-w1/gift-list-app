-- Co-manager tests (migration 0004). Run after privacy_test.sql on the same database.
\set ON_ERROR_STOP 1
\set QUIET 1
-- From privacy_test: a=Jonathan, b=wife (paired with a), c=mom (paired with a only);
-- kid 2000…01 created by a, with a wish 1000…04 that b marked bought.
reset role;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000e', 'unpaired@example.com'),
 ('00000000-0000-0000-0000-00000000000f', 'sister@example.com');
insert into connections (user_a, user_b) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000f');
select set_config('test.kid', '20000000-0000-0000-0000-000000000001', false);
select t_check((select count(*) from person_managers where person_id = current_setting('test.kid')::uuid), 1, 'creating a kid makes the creator its manager');

set role authenticated;
-- Wife's sister (paired with wife only) can't see the kid yet
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 0, 'not visible to someone paired only with a non-manager');

-- Wife (paired, not a manager) can't make herself a manager
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select t_fails($$insert into person_managers (person_id, user_id) values (current_setting('test.kid')::uuid, auth.uid())$$, 'non-manager cannot add herself as manager');

-- Jonathan adds wife; can't add someone he isn't paired with
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into person_managers (person_id, user_id) values (current_setting('test.kid')::uuid, '00000000-0000-0000-0000-00000000000b');
select t_fails($$insert into person_managers (person_id, user_id) values (current_setting('test.kid')::uuid, '00000000-0000-0000-0000-00000000000e')$$, 'cannot add an unpaired person as manager');
select t_fails($$insert into person_managers (person_id, user_id) select id, '00000000-0000-0000-0000-00000000000b' from people where user_id = auth.uid()$$, 'cannot add managers to a real account');

-- Wife now edits like a manager
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into items (id, person_id, kind, created_by, name) values ('10000000-0000-0000-0000-000000000005', current_setting('test.kid')::uuid, 'wish', auth.uid(), 'Bike');
with u as (update items set name = 'Lego set (big)' where id = '10000000-0000-0000-0000-000000000004' returning 1) select t_check((select count(*) from u), 1, 'co-manager edits a wish the other manager added');
with u as (update people set display_name = 'Kiddo' where id = current_setting('test.kid')::uuid returning 1) select t_check((select count(*) from u), 1, 'co-manager renames the kid');
select t_check((select count(*) from claims where item_id = '10000000-0000-0000-0000-000000000004'), 1, 'co-manager sees bought status on kid''s list');

-- Wife's side now sees the kid; still can't edit or add managers
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 1, 'visible to someone paired with ANY manager');
select t_check((select count(*) from items where person_id = current_setting('test.kid')::uuid and kind = 'wish'), 2, 'they see the kid''s wishlist');
select t_check((select count(*) from claims where item_id = '10000000-0000-0000-0000-000000000004'), 1, 'they see bought status (no duplicates)');
select t_fails($$insert into items (person_id, kind, created_by, name) values (current_setting('test.kid')::uuid, 'wish', auth.uid(), 'x')$$, 'non-manager still cannot edit the kid''s wishlist');
select t_fails($$insert into person_managers (person_id, user_id) values (current_setting('test.kid')::uuid, auth.uid())$$, 'non-manager cannot add managers');
with d as (delete from person_managers returning 1) select t_check((select count(*) from d), 0, 'non-manager cannot remove managers');
with d as (delete from people where id = current_setting('test.kid')::uuid returning 1) select t_check((select count(*) from d), 0, 'non-manager cannot delete the kid');
select t_check((select count(*) from person_managers where person_id = current_setting('test.kid')::uuid), 2, 'they can see who the managers are');

-- Unpaired user sees nothing
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 0, 'unpaired user cannot see the kid');
select t_check((select count(*) from person_managers), 0, 'unpaired user cannot see manager list');

-- Any manager can remove another, but never the last one
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
with d as (delete from person_managers where person_id = current_setting('test.kid')::uuid and user_id = '00000000-0000-0000-0000-00000000000a' returning 1)
  select t_check((select count(*) from d), 1, 'a manager can remove the other manager (even the creator)');
with d as (delete from person_managers where person_id = current_setting('test.kid')::uuid and user_id = auth.uid() returning 1)
  select t_check((select count(*) from d), 0, 'cannot remove the last manager');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select t_fails($$insert into items (person_id, kind, created_by, name) values (current_setting('test.kid')::uuid, 'wish', auth.uid(), 'x')$$, 'removed manager can no longer edit');
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 1, 'removed manager still sees the kid (paired with a manager)');
with d as (delete from people where id = current_setting('test.kid')::uuid returning 1) select t_check((select count(*) from d), 0, 'removed creator cannot delete the kid');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 0, 'mom (paired only with the removed manager) no longer sees the kid');

-- Account deletion: the kid survives while another manager remains
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into person_managers (person_id, user_id) values (current_setting('test.kid')::uuid, '00000000-0000-0000-0000-00000000000a');
select delete_my_account();
reset role;
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 1, 'kid survives when one manager deletes their account');
select t_check((select count(*) from person_managers where person_id = current_setting('test.kid')::uuid), 1, 'remaining manager is still the manager');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select delete_my_account();
reset role;
select t_check((select count(*) from people where id = current_setting('test.kid')::uuid), 0, 'kid is removed when its last manager deletes their account');
\echo ALL CO-MANAGER TESTS PASSED
