create table public.staff_codes (
  role app_role primary key,
  code text not null,
  user_id uuid,
  updated_at timestamptz not null default now()
);
grant select, update on public.staff_codes to authenticated;
grant all on public.staff_codes to service_role;
alter table public.staff_codes enable row level security;
create policy "landlord sees all codes, caretaker own" on public.staff_codes for select to authenticated
  using (public.has_role(auth.uid(),'landlord') or (role = 'caretaker' and public.has_role(auth.uid(),'caretaker')));
create policy "update own code" on public.staff_codes for update to authenticated
  using (public.has_role(auth.uid(), role)) with check (public.has_role(auth.uid(), role) and code ~ '^[0-9]{4,8}$');
insert into public.staff_codes(role, code) values ('landlord','9060'),('caretaker','4035');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_app_meta_data->>'role','tenant');
begin
  insert into public.profiles(id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, new.raw_user_meta_data->>'phone');
  if r not in ('landlord','caretaker','tenant') then r := 'tenant'; end if;
  insert into public.user_roles(user_id, role) values (new.id, r::app_role);
  return new;
end $$;