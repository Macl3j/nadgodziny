import { login } from './actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
            <form className="w-full max-w-sm p-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg space-y-6 border border-slate-200 dark:border-slate-800">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Logowanie (Hurst)</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Podaj swoje dane, aby wejść do systemu</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="jan.kowalski@hurst.pl" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Hasło</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>
                </div>

                <Button formAction={login} className="w-full">
                    Zaloguj się
                </Button>
            </form>
        </div>
    )
}
