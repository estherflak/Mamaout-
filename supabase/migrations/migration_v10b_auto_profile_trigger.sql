-- Migration v10b: auto-create a profiles row when a new auth user signs up.
-- (Written 2026-06-23, after migration_v10.sql/saved-searches had already
-- taken the number "v10". Renamed v10 → v10b when the accidentally nested
-- migrations/migrations/ folder was flattened. Both are applied in prod.)
--
-- Until now a profile row only existed after a user finished onboarding (the
-- upsert in OnboardingScreen). Any code path that reads a profile before that
-- hits null. This trigger guarantees every authenticated user has a row.
--
-- Safe to run more than once. onboarding_done keeps its column default (false),
-- so new users still see the onboarding flow exactly as before.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
