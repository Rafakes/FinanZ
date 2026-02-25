-- Add is_recurring column to transactions
alter table transactions add column is_recurring boolean default false;
