-- Automatically delete related user records when an auth.user is deleted
CREATE OR REPLACE FUNCTION public.handle_deleted_user() RETURNS TRIGGER AS $$ BEGIN -- Overtime balance has a foreign key to users, so it's best we delete it first
DELETE FROM public.overtime_balance
WHERE user_id = OLD.id;
-- Delete requests related to user
DELETE FROM public.overtime_requests
WHERE user_id = OLD.id;
-- Delete the public user profile
DELETE FROM public.users
WHERE id = OLD.id;
RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Drop trigger if exists to be safe
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
-- Create trigger on auth.users for deletion
CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();