-- Let's check what is actually in the tables
SELECT 'Auth Users Count:' as check,
    count(*) as result
FROM auth.users
UNION ALL
SELECT 'Public Users Count:' as check,
    count(*) as result
FROM public.users
UNION ALL
SELECT 'Overtime Balance Count:' as check,
    count(*) as result
FROM public.overtime_balance;