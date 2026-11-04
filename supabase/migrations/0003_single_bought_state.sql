-- Claims now have a single state: "bought". A claim row means someone bought it.
-- Safe on live data: converts existing "claimed" rows and changes the default.
update public.claims set status = 'purchased' where status = 'claimed';
alter table public.claims alter column status set default 'purchased';
