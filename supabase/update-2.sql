-- للي شغّل setup.sql القديم: شغّل ده بس (يثبّت الكود ويمنع تغييره)
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.attendees to authenticated;

create or replace function prevent_code_change() returns trigger as $$
begin
  if new.code <> old.code then
    raise exception 'code cannot be changed';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists attendees_code_lock on attendees;
create trigger attendees_code_lock
  before update on attendees
  for each row execute function prevent_code_change();
