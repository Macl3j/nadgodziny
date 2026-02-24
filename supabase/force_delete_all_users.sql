-- Najpierw usuwamy dane powiązane z użytkownikami publicznymi
DELETE FROM public.overtime_requests;
DELETE FROM public.overtime_balance;
DELETE FROM public.users;
-- Następnie usuwamy wszystkich zebranych w systemie uwierzytelniania
DELETE FROM auth.users;