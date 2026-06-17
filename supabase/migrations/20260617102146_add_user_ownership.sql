-- Add per-user ownership to todos.

-- Each row belongs to the authenticated user that created it.
alter table public.todos
  add column user_id uuid default auth.uid()
  references auth.users (id) on delete cascade;

-- Remove any pre-auth rows that have no owner, then enforce ownership.
delete from public.todos where user_id is null;
alter table public.todos alter column user_id set not null;

create index if not exists todos_user_id_idx on public.todos (user_id);

-- Drop the old public (shared) policies.
drop policy if exists "Public read access"   on public.todos;
drop policy if exists "Public insert access" on public.todos;
drop policy if exists "Public update access" on public.todos;
drop policy if exists "Public delete access" on public.todos;

-- Per-user policies: a user may only see and modify their own rows.
create policy "Users read own todos"
  on public.todos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own todos"
  on public.todos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own todos"
  on public.todos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own todos"
  on public.todos for delete
  to authenticated
  using (auth.uid() = user_id);
