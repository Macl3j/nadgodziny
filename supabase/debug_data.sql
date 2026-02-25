SELECT id,
    email,
    role,
    manager_id
FROM public.users;
SELECT id,
    user_id,
    manager_id,
    hours,
    status
FROM public.overtime_requests;