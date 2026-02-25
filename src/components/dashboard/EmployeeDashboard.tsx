'use client'

import { useState, useEffect } from 'react'
import { AppUser } from '@/utils/supabase/getUser'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { submitOvertimeRequest } from '@/app/dashboard/actions'

interface Props {
    user: AppUser
}

export default function EmployeeDashboard({ user }: Props) {
    const supabase = createClient()
    const [balance, setBalance] = useState<number>(0)
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)

        // Fetch balance
        const { data: balanceData } = await supabase
            .from('overtime_balance')
            .select('balance_hours')
            .eq('user_id', user.id)
            .single()

        if (balanceData) setBalance(balanceData.balance_hours)

        // Fetch history
        const { data: historyData } = await supabase
            .from('overtime_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (historyData) setRequests(historyData)

        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const pendingCount = requests.filter(r => r.status === 'pending').length

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        try {
            await submitOvertimeRequest(formData)
            setOpen(false)
            fetchData()
        } catch (error: any) {
            alert(error.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Nadgodzin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : `${balance} h`}</div>
                        <p className="text-xs text-muted-foreground">
                            Aktualne saldo do odbioru
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Oczekujące Wnioski</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : pendingCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Wymagają zatwierdzenia menedżera
                        </p>
                    </CardContent>
                </Card>

                <Card className="flex items-center justify-center p-6">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full h-full flex flex-col gap-2 py-6 text-lg">
                                <Plus className="h-6 w-6" />
                                Złóż wniosek (1:1)
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Wniosek o Odbiór Nadgodzin (1:1)</DialogTitle>
                                <DialogDescription>
                                    Uwaga: Możesz wnioskować jedynie, jeśli Twoje saldo jest dodatnie. Pamiętaj, żeby złożyć wniosek przed końcem okresu rozliczeniowego.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Liczba godzin (odbiór = wpisz ujemną wartość, np. -8)</Label>
                                        <Input type="number" step="0.5" name="hours" required placeholder="-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data (dzień, w którym wykorzystasz wolne)</Label>
                                        <Input type="date" name="date" required />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
                                    <Button type="submit">Wyślij wniosek</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historia</CardTitle>
                    <CardDescription>Twoje wnioski narzucone i własne.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Ładowanie...</p>
                        ) : requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Brak historii wniosków.</p>
                        ) : (
                            requests.map(req => (
                                <div key={req.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {req.is_manager_initiated ? 'Zlecenie narzucone przez Menedżera' : 'Twój wniosek o Odbiór / Przesłanie'}
                                            {' '} ({req.compensation_mode})
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Godziny: {req.hours} | Data akcji: {req.request_date}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                                        className={req.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    >
                                        {req.status === 'pending' ? 'Oczekujący' : req.status === 'approved' ? 'Zatwierdzony' : 'Odrzucony'}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
