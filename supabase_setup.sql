-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- 1. Drop existing policies to fix infinite recursion issues
drop policy if exists "Users can view families they belong to" on public.families;
drop policy if exists "Users can create families" on public.families;
drop policy if exists "Users can view members of their families" on public.family_members;
drop policy if exists "Users can join families" on public.family_members;

-- 2. Create tables (if they don't exist)
create table if not exists public.families (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users not null
);

create table if not exists public.family_members (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families on delete cascade not null,
  user_id uuid references auth.users not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(family_id, user_id)
);

-- 3. Helper function to avoid RLS infinite recursion
-- This function runs with owner privileges (SECURITY DEFINER) to bypass RLS when checking membership
create or replace function public.get_my_family_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id from public.family_members where user_id = auth.uid();
$$;

-- 4. Enable RLS
alter table public.families enable row level security;
alter table public.family_members enable row level security;

-- 5. Create policies using the secure function

-- Families policies
create policy "Users can view families they belong to"
  on public.families for select
  using (
    auth.uid() = created_by 
    or id in (select public.get_my_family_ids())
  );

create policy "Users can create families"
  on public.families for insert
  with check (auth.uid() = created_by);

-- Family members policies
create policy "Users can view members of their families"
  on public.family_members for select
  using (
    family_id in (select public.get_my_family_ids())
  );

create policy "Users can join families"
  on public.family_members for insert
  with check (
    user_id = auth.uid()
  );

-- 6. Add columns to existing tables
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'family_id') then
        alter table public.transactions add column family_id uuid references public.families on delete cascade;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'points') then
        alter table public.transactions add column points integer default 5;
    end if;
end $$;

do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'credit_cards' and column_name = 'family_id') then
        alter table public.credit_cards add column family_id uuid references public.families on delete cascade;
    end if;
end $$;

-- 7. Create profiles table and triggers (for member lookup)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for existing users
insert into public.profiles (id, email, full_name, avatar_url)
select id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- 8. Function to add family member by email
create or replace function public.add_family_member_by_email(family_id_input uuid, email_input text)
returns void
language plpgsql
security definer
as $$
declare
  target_user_id uuid;
begin
  -- Check if requester is admin of the family
  if not exists (
    select 1 from public.family_members
    where family_id = family_id_input
    and user_id = auth.uid()
    and role = 'admin'
  ) then
    raise exception 'Apenas administradores podem adicionar membros.';
  end if;

  -- Find user by email
  select id into target_user_id from public.profiles where email = email_input;

  if target_user_id is null then
    raise exception 'Usuário não encontrado com este e-mail.';
  end if;

  -- Add to family
  insert into public.family_members (family_id, user_id, role)
  values (family_id_input, target_user_id, 'member')
  on conflict (family_id, user_id) do nothing;
end;
$$;

-- 9. Add Foreign Key to allow joining family_members with profiles
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'family_members_user_id_fkey_profiles'
  ) then
    alter table public.family_members 
    add constraint family_members_user_id_fkey_profiles 
    foreign key (user_id) 
    references public.profiles(id);
  end if;
end $$;

-- 10. Create notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- 11. Trigger to notify user when their family transaction is deleted
create or replace function public.notify_transaction_deletion()
returns trigger as $$
declare
  family_name text;
begin
  -- Only proceed if it was a family transaction
  if old.family_id is not null then
    -- Get family name
    select name into family_name from public.families where id = old.family_id;
    
    -- Insert notification for the owner of the transaction
    -- (Even if they deleted it themselves, per requirements, or maybe filter? 
    -- "a pessoa que criou a despesa recebe uma notificação")
    insert into public.notifications (user_id, message)
    values (
      old.user_id, 
      'Uma despesa (' || old.name || ') que você criou foi removida da família ' || coalesce(family_name, 'Desconhecida')
    );
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_transaction_deleted on public.transactions;
create trigger on_transaction_deleted
  after delete on public.transactions
  for each row execute procedure public.notify_transaction_deletion();
