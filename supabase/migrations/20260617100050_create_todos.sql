-- todos table
create table if not exists public.todos (
  id         bigint generated always as identity primary key,
  text       text not null check (char_length(text) > 0),
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

-- keep newest ordering fast
create index if not exists todos_created_at_idx on public.todos (created_at);

-- Row Level Security
alter table public.todos enable row level security;

-- NOTE: This app has no authentication, so we allow the public (anon) role
-- full access. This means the todo list is shared/global across all visitors.
create policy "Public read access"
  on public.todos for select
  to anon, authenticated
  using (true);

create policy "Public insert access"
  on public.todos for insert
  to anon, authenticated
  with check (true);

create policy "Public update access"
  on public.todos for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Public delete access"
  on public.todos for delete
  to anon, authenticated
  using (true);
