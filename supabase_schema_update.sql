-- Add credit_cards table
create table credit_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  limit_amount numeric not null,
  closing_day integer not null,
  due_day integer not null,
  created_at timestamptz default now()
);

-- Add card_id to transactions
alter table transactions add column card_id uuid references credit_cards(id);

-- RLS for credit_cards
alter table credit_cards enable row level security;

create policy "Users can view their own cards"
  on credit_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert their own cards"
  on credit_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cards"
  on credit_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete their own cards"
  on credit_cards for delete
  using (auth.uid() = user_id);
