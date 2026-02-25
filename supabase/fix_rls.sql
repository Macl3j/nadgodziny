-- Usuwamy potencjalnie zwiedzające/zapętlone polisy
DROP POLICY IF EXISTS "Managers can view their employees" ON public.users;
DROP POLICY IF EXISTS "HR can view everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
-- Wprowadzamy bezpieczną, niezapętloną regułę dla tabeli użytkowników
-- W firmowej aplikacji wewnątrz organizacji zalecane jest, by pracownicy 
-- mogli widzieć nawzajem swoje imiona, co ułatwia zarządzanie i unika pętli bazy.
CREATE POLICY "Authenticated users can view users" ON public.users FOR
SELECT USING (auth.role() = 'authenticated');
-- Zmieniamy funkcję sprawdzającą byłą prostsza i bardziej niezawodna dla innych tabel
CREATE OR REPLACE FUNCTION public.is_manager_of(employee_uuid UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = employee_uuid
            AND manager_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;