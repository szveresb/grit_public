

## Problem

QuickPulse mood taps and full journal entries (created via EntryModal) both write to `journal_entries.impact_level`. The "Hangulati trend" chart reads ALL `journal_entries` with `impact_level != null`, mixing observation-based entries with quick mood pulses. These are two different data streams that must stay separate.

## Solution

Create a dedicated `mood_pulses` table for QuickPulse data. The MoodTrendChart reads exclusively from this table. Journal entries keep their `impact_level` for their own purposes but no longer feed the mood trend.

### 1. New table: `mood_pulses`

```sql
create table public.mood_pulses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  level integer not null check (level between 1 and 5),
  label text not null,
  entry_date date not null default current_date,
  created_at timestamptz default now()
);

alter table public.mood_pulses enable row level security;

create policy "Users manage own pulses"
  on public.mood_pulses for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

### 2. QuickPulse component (`QuickPulse.tsx`)

- When `onMoodSelected` callback exists (CheckIn page flow): call the callback as today, **and** insert into `mood_pulses` (level, label, entry_date = today).
- Standalone fallback path: insert into `mood_pulses` instead of `journal_entries`.
- QuickPulse no longer writes to `journal_entries` at all.

### 3. CheckIn.tsx data fetch

- Add a separate query: `supabase.from('mood_pulses').select('level, entry_date').eq('user_id', user.id)`
- Feed `moodData` from `mood_pulses` rows (not journal entries).
- Remove the current `journalData.filter(j => j.impact_level != null)` → `setMoodData(...)` line.

### 4. MoodTrendChart — no changes needed

It already accepts `{ date, level }[]`; the data source change happens in CheckIn.tsx.

### Files

| Action | File |
|--------|------|
| Create | Migration SQL (mood_pulses table + RLS) |
| Modify | `src/components/checkin/QuickPulse.tsx` — write to `mood_pulses` |
| Modify | `src/pages/CheckIn.tsx` — fetch from `mood_pulses` for chart data |

