-- Skrypt synchronizacji: Wyszukuje konta dodane w 'Authentication' i uzupełnia dla nich ręcznie tabele 'users' oraz 'overtime_balance'
-- jeśli wyzwalacz zawiódł.
INSERT INTO public.users (id, email, full_name, role)
SELECT id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Bez nazwiska'),
    'employee'
FROM auth.users
WHERE id NOT IN (
        SELECT id
        FROM public.users
    );
INSERT INTO public.overtime_balance (user_id, balance_hours)
SELECT id,
    0
FROM public.users
WHERE id NOT IN (
        SELECT user_id
        FROM public.overtime_balance
    );