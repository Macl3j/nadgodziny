-- Enums
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'hr');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE compensation_mode AS ENUM ('1:1', '1:1.5');
-- Users table extending Supabase auth.users
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'employee'::user_role NOT NULL,
    manager_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Overtime balance
CREATE TABLE public.overtime_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
    balance_hours NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    -- positive means they have extra hours, negative means they owe hours
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Overtime requests
CREATE TABLE public.overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    manager_id UUID REFERENCES public.users(id) NOT NULL,
    hours NUMERIC(5, 2) NOT NULL,
    compensation_mode compensation_mode NOT NULL,
    request_date DATE NOT NULL,
    status request_status DEFAULT 'pending'::request_status NOT NULL,
    is_manager_initiated BOOLEAN DEFAULT FALSE NOT NULL,
    -- true if manager forced 1:1.5
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
-- Helper function to check if user is manager
CREATE OR REPLACE FUNCTION public.is_manager_of(employee_uuid UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = employee_uuid
            AND manager_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Policies for users
CREATE POLICY "Users can view own profile" ON public.users FOR
SELECT USING (auth.uid() = id);
CREATE POLICY "Managers can view their employees" ON public.users FOR
SELECT USING (is_manager_of(id));
CREATE POLICY "HR can view everyone" ON public.users FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role = 'hr'
    )
);
-- Policies for overtime balance
CREATE POLICY "Employees can view own balance" ON public.overtime_balance FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view team balance" ON public.overtime_balance FOR
SELECT USING (is_manager_of(user_id));
CREATE POLICY "HR can view and edit all balances" ON public.overtime_balance FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role = 'hr'
    )
);
-- Policies for overtime requests
CREATE POLICY "Employees can view own requests" ON public.overtime_requests FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Employees can insert own requests" ON public.overtime_requests FOR
INSERT WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND is_manager_initiated = FALSE
    );
CREATE POLICY "Managers can view team requests" ON public.overtime_requests FOR
SELECT USING (
        is_manager_of(user_id)
        OR auth.uid() = manager_id
    );
CREATE POLICY "Managers can update team requests" ON public.overtime_requests FOR
UPDATE USING (
        is_manager_of(user_id)
        OR auth.uid() = manager_id
    );
CREATE POLICY "Managers can insert requests for team" ON public.overtime_requests FOR
INSERT WITH CHECK (
        (
            is_manager_of(user_id)
            OR auth.uid() = manager_id
        )
        AND is_manager_initiated = TRUE
        AND compensation_mode = '1:1.5'
    );
CREATE POLICY "HR can view all requests" ON public.overtime_requests FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE id = auth.uid()
                AND role = 'hr'
        )
    );
-- Trigger to update balance when request is approved
CREATE OR REPLACE FUNCTION process_overtime_request() RETURNS TRIGGER AS $$
DECLARE hours_to_add NUMERIC;
BEGIN -- Only process when status changes from pending to approved
IF (
    OLD.status = 'pending'
    AND NEW.status = 'approved'
) THEN IF NEW.compensation_mode = '1:1.5' THEN hours_to_add := NEW.hours * 1.5;
ELSE hours_to_add := NEW.hours;
END IF;
-- Update balance
UPDATE public.overtime_balance
SET balance_hours = balance_hours + hours_to_add,
    updated_at = NOW()
WHERE user_id = NEW.user_id;
-- If no balance record exists, maybe insert one? Better let trigger on users handle initialization
END IF;
-- Update updated_at
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER on_request_approved BEFORE
UPDATE ON public.overtime_requests FOR EACH ROW EXECUTE FUNCTION process_overtime_request();
-- Trigger to create user and balance after auth registration
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
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();