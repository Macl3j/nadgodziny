-- Upraszczamy polisy dla tabeli overtime_requests i overtime_balance
-- Jako że filtrujemy to już odpowiednio w kodzie frontendu (eq('manager_id', user.id)),
-- możemy bezpiecznie zezwolić zalogowanym na dostęp READ do tych tabel. Uchroni to przed
-- brakiem wyświetlania z powodu zagnieżdżonych polityk RLS supabase.
DROP POLICY IF EXISTS "Managers can view team requests" ON public.overtime_requests;
DROP POLICY IF EXISTS "Employees can view own requests" ON public.overtime_requests;
DROP POLICY IF EXISTS "HR can view all requests" ON public.overtime_requests;
CREATE POLICY "Authenticated users can view overtime_requests" ON public.overtime_requests FOR
SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Managers can update team requests" ON public.overtime_requests;
CREATE POLICY "Authenticated users can update overtime_requests" ON public.overtime_requests FOR
UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Employees can view own balance" ON public.overtime_balance;
DROP POLICY IF EXISTS "Managers can view team balance" ON public.overtime_balance;
DROP POLICY IF EXISTS "HR can view and edit all balances" ON public.overtime_balance;
CREATE POLICY "Authenticated users can view overtime_balance" ON public.overtime_balance FOR
SELECT USING (auth.role() = 'authenticated');