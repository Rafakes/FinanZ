-- Create families table
create table if not exists families (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users not null
);

-- Create family_members table
create table if not exists family_members (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families on delete cascade not null,
  user_id uuid references auth.users not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(family_id, user_id)
);

-- Add family_id to transactions if not exists
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'family_id') then
        alter table transactions add column family_id uuid references families on delete cascade;
    end if;
end $$;

-- Add family_id to credit_cards if not exists
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'credit_cards' and column_name = 'family_id') then
        alter table credit_cards add column family_id uuid references families on delete cascade;
    end if;
end $$;
