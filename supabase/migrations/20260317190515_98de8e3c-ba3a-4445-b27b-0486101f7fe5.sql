
create table public.mood_pulses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  level integer not null,
  label text not null,
  entry_date date not null default current_date,
  created_at timestamptz default now()
);

-- Validation trigger instead of check constraint
create or replace function public.validate_mood_pulse_level()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.level < 1 or NEW.level > 5 then
    raise exception 'Level must be between 1 and 5';
  end if;
  return NEW;
end;
$$;

create trigger trg_validate_mood_pulse_level
before insert or update on public.mood_pulses
for each row execute function public.validate_mood_pulse_level();

alter table public.mood_pulses enable row level security;

create policy "Users manage own pulses"
  on public.mood_pulses for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
