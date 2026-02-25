-- Create a table for transactions
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric not null,
  category text not null,
  name text not null,
  description text,
  date timestamptz default now() not null,
  created_at timestamptz default now()
);

-- Set up Row Level Security (RLS)
alter table transactions enable row level security;

-- Create policies
create policy "Users can view their own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on transactions for delete
  using (auth.uid() = user_id);
