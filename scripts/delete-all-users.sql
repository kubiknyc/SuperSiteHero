-- Delete all users from the database
-- WARNING: This will delete ALL users and their associated data

-- Delete from auth.users (this should cascade to public.users via foreign key)
DELETE FROM auth.users;

-- If cascade doesn't work, manually delete from public tables
DELETE FROM public.project_users;
DELETE FROM public.users;
