import { getUser } from '@/utils/supabase/getUser'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard'
import ManagerDashboard from '@/components/dashboard/ManagerDashboard'

export default async function DashboardPage() {
    const user = await getUser()

    if (!user) {
        return null
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Witaj, {user.full_name}</h1>
                <p className="text-muted-foreground">Oto Twoje podsumowanie nadgodzin.</p>
            </div>

            {user.role === 'employee' && <EmployeeDashboard user={user} />}
            {user.role === 'manager' && <ManagerDashboard user={user} />}
            {user.role === 'hr' && (
                <div className="text-center p-12 bg-white rounded-lg border border-slate-200">
                    <h2 className="text-xl font-semibold">Panel HR w przygotowaniu</h2>
                    <p className="text-muted-foreground mt-2">Dostęp do modułu raportowego wkrótce.</p>
                </div>
            )}
        </div>
    )
}
