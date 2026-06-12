alter table public.profiles
  alter column id drop default;

alter table public.profiles
  add constraint profiles_id_auth_users_fk
  foreign key (id)
  references auth.users(id)
  on delete cascade;
