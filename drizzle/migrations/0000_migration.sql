create type public.app_role as enum ('landlord','caretaker','tenant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read roles" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','tenant');
begin
  insert into public.profiles(id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, new.raw_user_meta_data->>'phone');
  if r not in ('landlord','caretaker','tenant') then r := 'tenant'; end if;
  insert into public.user_roles(user_id, role) values (new.id, r::app_role);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid(),
  caretaker_id uuid,
  name text not null,
  location text not null default '',
  created_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  rent numeric not null default 0,
  created_at timestamptz not null default now()
);
create table public.leases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  tenant_id uuid not null,
  start_date date not null default current_date,
  end_date date,
  monthly_rent numeric not null,
  agreement text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  period date not null,
  amount numeric not null,
  due_date date not null,
  status text not null default 'unpaid',
  created_at timestamptz not null default now(),
  unique (lease_id, period)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references public.bills(id) on delete set null,
  lease_id uuid not null references public.leases(id) on delete cascade,
  tenant_id uuid not null default auth.uid(),
  mpesa_code text not null unique,
  amount numeric not null,
  status text not null default 'pending',
  sent_to_landlord boolean not null default false,
  sent_to_caretaker boolean not null default false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  tenant_id uuid not null default auth.uid(),
  title text not null,
  description text not null default '',
  status text not null default 'open',
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid(),
  recipient_id uuid not null,
  body text not null,
  payment_id uuid references public.payments(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  kind text not null default 'notice',
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.properties, public.rooms, public.leases, public.bills, public.maintenance_requests, public.notices to authenticated;
grant select, insert on public.payments to authenticated;
grant select, insert, update on public.messages to authenticated;
grant all on public.properties, public.rooms, public.leases, public.bills, public.payments, public.maintenance_requests, public.messages, public.notices to service_role;

alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.leases enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.messages enable row level security;
alter table public.notices enable row level security;

create or replace function public.is_property_landlord(_pid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from properties where id=_pid and landlord_id=auth.uid()) $$;
create or replace function public.is_property_staff(_pid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from properties where id=_pid and (landlord_id=auth.uid() or caretaker_id=auth.uid())) $$;
create or replace function public.is_property_tenant(_pid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from leases l join rooms r on r.id=l.room_id where r.property_id=_pid and l.tenant_id=auth.uid()) $$;
create or replace function public.lease_property(_lid uuid) returns uuid language sql stable security definer set search_path=public as $$
  select r.property_id from leases l join rooms r on r.id=l.room_id where l.id=_lid $$;
create or replace function public.room_property(_rid uuid) returns uuid language sql stable security definer set search_path=public as $$
  select property_id from rooms where id=_rid $$;

create policy "view property" on public.properties for select to authenticated using (landlord_id=auth.uid() or caretaker_id=auth.uid() or public.is_property_tenant(id));
create policy "landlord insert property" on public.properties for insert to authenticated with check (landlord_id=auth.uid() and public.has_role(auth.uid(),'landlord'));
create policy "landlord update property" on public.properties for update to authenticated using (landlord_id=auth.uid());
create policy "landlord delete property" on public.properties for delete to authenticated using (landlord_id=auth.uid());

create policy "view rooms" on public.rooms for select to authenticated using (public.is_property_staff(property_id) or public.is_property_tenant(property_id));
create policy "landlord write rooms" on public.rooms for all to authenticated using (public.is_property_landlord(property_id)) with check (public.is_property_landlord(property_id));

create policy "view leases" on public.leases for select to authenticated using (tenant_id=auth.uid() or public.is_property_staff(public.room_property(room_id)));
create policy "landlord write leases" on public.leases for all to authenticated using (public.is_property_landlord(public.room_property(room_id))) with check (public.is_property_landlord(public.room_property(room_id)));

create policy "view bills" on public.bills for select to authenticated using (exists(select 1 from leases l where l.id=lease_id and l.tenant_id=auth.uid()) or public.is_property_staff(public.lease_property(lease_id)));
create policy "staff write bills" on public.bills for all to authenticated using (public.is_property_staff(public.lease_property(lease_id))) with check (public.is_property_staff(public.lease_property(lease_id)));

create policy "view payments" on public.payments for select to authenticated using (tenant_id=auth.uid() or public.is_property_staff(public.lease_property(lease_id)));
create policy "tenant insert payment" on public.payments for insert to authenticated with check (tenant_id=auth.uid() and status='pending' and sent_to_landlord=false and sent_to_caretaker=false and exists(select 1 from leases l where l.id=lease_id and l.tenant_id=auth.uid()));

create policy "view maintenance" on public.maintenance_requests for select to authenticated using (tenant_id=auth.uid() or public.is_property_staff(public.lease_property(lease_id)));
create policy "tenant raise" on public.maintenance_requests for insert to authenticated with check (tenant_id=auth.uid() and exists(select 1 from leases l where l.id=lease_id and l.tenant_id=auth.uid()));
create policy "staff update maintenance" on public.maintenance_requests for update to authenticated using (public.is_property_staff(public.lease_property(lease_id)));

create policy "view messages" on public.messages for select to authenticated using (sender_id=auth.uid() or recipient_id=auth.uid());
create policy "send messages" on public.messages for insert to authenticated with check (sender_id=auth.uid());
create policy "mark read" on public.messages for update to authenticated using (recipient_id=auth.uid());

create policy "view notices" on public.notices for select to authenticated using (public.is_property_staff(property_id) or public.is_property_tenant(property_id));
create policy "staff post notices" on public.notices for insert to authenticated with check (author_id=auth.uid() and public.is_property_staff(property_id));
create policy "staff delete notices" on public.notices for delete to authenticated using (public.is_property_staff(property_id));

-- monthly bill generation (idempotent)
create or replace function public.generate_monthly_bills() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  insert into bills(lease_id, period, amount, due_date)
  select l.id, date_trunc('month', current_date)::date, l.monthly_rent, (date_trunc('month', current_date) + interval '4 days')::date
  from leases l where l.active and l.start_date <= current_date and (l.end_date is null or l.end_date >= date_trunc('month', current_date)::date)
  on conflict (lease_id, period) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.generate_monthly_bills() to authenticated;

create or replace function public.on_lease_created() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into bills(lease_id, period, amount, due_date)
  values (new.id, date_trunc('month', greatest(new.start_date, current_date))::date, new.monthly_rent, greatest(new.start_date, current_date) + 5)
  on conflict do nothing;
  insert into notices(property_id, author_id, kind, title, body)
  values (room_property(new.room_id), coalesce(auth.uid(), new.tenant_id), 'move_in', 'Move-in', 'A tenant moved in on ' || new.start_date::text);
  return new;
end $$;
create trigger lease_created after insert on public.leases for each row execute function public.on_lease_created();

create or replace function public.find_user_by_email(_email text) returns uuid language sql stable security definer set search_path=public as $$
  select id from profiles where lower(email)=lower(trim(_email)) and (has_role(auth.uid(),'landlord')) limit 1 $$;
grant execute on function public.find_user_by_email(text) to authenticated;

-- tenant forwards payment to landlord and/or caretaker
create or replace function public.send_payment(_payment_id uuid, _to_landlord boolean, _to_caretaker boolean) returns void language plpgsql security definer set search_path=public as $$
declare p payments; prop properties;
begin
  select * into p from payments where id=_payment_id and tenant_id=auth.uid();
  if p.id is null then raise exception 'Payment not found'; end if;
  select pr.* into prop from properties pr where pr.id = lease_property(p.lease_id);
  if _to_landlord and not p.sent_to_landlord then
    update payments set sent_to_landlord=true where id=p.id;
    insert into messages(sender_id, recipient_id, body, payment_id) values (auth.uid(), prop.landlord_id, 'M-PESA payment of KES ' || p.amount || ' — code ' || p.mpesa_code || '. Please verify.', p.id);
  end if;
  if _to_caretaker and prop.caretaker_id is not null and not p.sent_to_caretaker then
    update payments set sent_to_caretaker=true where id=p.id;
    insert into messages(sender_id, recipient_id, body, payment_id) values (auth.uid(), prop.caretaker_id, 'M-PESA payment of KES ' || p.amount || ' — code ' || p.mpesa_code || '. Please verify.', p.id);
  end if;
end $$;
grant execute on function public.send_payment(uuid, boolean, boolean) to authenticated;

-- staff re-enters the code; approve only if it matches
create or replace function public.review_payment(_payment_id uuid, _code text, _approve boolean) returns text language plpgsql security definer set search_path=public as $$
declare p payments;
begin
  select * into p from payments where id=_payment_id;
  if p.id is null or not is_property_staff(lease_property(p.lease_id)) then raise exception 'Not allowed'; end if;
  if p.status <> 'pending' then raise exception 'Already reviewed'; end if;
  if _approve and upper(trim(_code)) <> p.mpesa_code then raise exception 'Code does not match the tenant''s transaction code'; end if;
  update payments set status = case when _approve then 'approved' else 'rejected' end, reviewed_by=auth.uid(), reviewed_at=now() where id=p.id;
  if _approve and p.bill_id is not null then
    if (select coalesce(sum(amount),0) from payments where bill_id=p.bill_id and status='approved') >= (select amount from bills where id=p.bill_id) then
      update bills set status='paid' where id=p.bill_id;
    end if;
  end if;
  insert into messages(sender_id, recipient_id, body, payment_id) values (auth.uid(), p.tenant_id,
    case when _approve then 'Your payment ' || p.mpesa_code || ' has been approved. Thank you!' else 'Your payment ' || p.mpesa_code || ' was rejected. Please contact us.' end, p.id);
  return case when _approve then 'approved' else 'rejected' end;
end $$;
grant execute on function public.review_payment(uuid, text, boolean) to authenticated;

create or replace function public.normalize_code() returns trigger language plpgsql as $$
begin
  new.mpesa_code := upper(trim(new.mpesa_code));
  if new.mpesa_code !~ '^[A-Z0-9]{10}$' then raise exception 'M-PESA code must be 10 letters/numbers'; end if;
  return new;
end $$;
create trigger payments_normalize before insert on public.payments for each row execute function public.normalize_code();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.payments;

create extension if not exists pg_cron;
select cron.schedule('generate-monthly-bills', '0 0 1 * *', $$ select public.generate_monthly_bills(); $$);