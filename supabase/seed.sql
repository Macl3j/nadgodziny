-- 1. Create your users in the Auth > Users panel in Supabase dashboard
-- 2. Then run this SQL in the SQL Editor to assign roles and set up reporting lines
-- Example: Set user 1 as HR
UPDATE public.users
SET role = 'hr'
WHERE email = 'hr@hurst.pl';
-- Replace with actual email
-- Example: Set user 2 as Manager
UPDATE public.users
SET role = 'manager'
WHERE email = 'manager@hurst.pl';
-- Example: Set user 3 as Employee and assign them to the Manager
UPDATE public.users
SET role = 'employee',
    manager_id = (
        SELECT id
        FROM public.users
        WHERE email = 'manager@hurst.pl'
    )
WHERE email = 'pracownik@hurst.pl';
-- The trigger automatically creates `overtime_balance` with 0 hours for every new user.
-- Optionally, you can give the employee some starting balance:
UPDATE public.overtime_balance
SET balance_hours = 25.5
WHERE user_id = (
        SELECT id
        FROM public.users
        WHERE email = 'pracownik@hurst.pl'
    );