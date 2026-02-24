-- Drop the previous trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Drop and recreate the function
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.users (id, email, full_name, role)
VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            'Bez nazwiska'
        ),
        'employee'
    );
INSERT INTO public.overtime_balance (user_id, balance_hours)
VALUES (NEW.id, 0);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Reattach the trigger
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();