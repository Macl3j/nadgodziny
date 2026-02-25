'use client'

import { useState, useEffect } from 'react'
import { AppUser } from '@/utils/supabase/getUser'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { resolveRequest, submitForcedOvertime } from '@/app/dashboard/actions'

interface Props {
    user: AppUser
}

export default function ManagerDashboard({ user }: Props) {
    const supabase = createClient()
    const [requests, setRequests] = useState<any[]>([])
    const [team, setTeam] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [debugInfo, setDebugInfo] = useState<any>(null)

    const fetchData = async () => {
        setLoading(true)

        // Fetch team balances
        const { data: teamData, error: teamError } = await supabase
            .from('users')
            .select(`
        id, 
        full_name, 
        role, 
        overtime_balance!inner(balance_hours)
      `)
            .eq('manager_id', user.id)

        if (teamData) setTeam(teamData)

        // Fetch team pending requests
        const { data: reqData, error: reqError } = await supabase
            .from('overtime_requests')
            .select('*, users!overtime_requests_user_id_fkey!inner(full_name)')
            .eq('manager_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (reqData) setRequests(reqData)

        setDebugInfo({ teamError, reqError })
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleResolve = async (reqId: string, approve: boolean) => {
        await resolveRequest(reqId, approve)
        fetchData()
    }

    const handleForceOvertime = async (employeeId: string) => {
        const hours = prompt('Ile godzin nadgodzin chcesz narzucić (1:1.5)?')
        if (!hours) return
        const date = prompt('Podaj datę nadgodzin (RRRR-MM-DD):')
        if (!date) return

        const formData = new FormData()
        formData.append('employee_id', employeeId)
        formData.append('hours', hours)
        formData.append('date', date)

        await submitForcedOvertime(formData)
        alert('Zlecono nadgodziny.')
        fetchData() // refreshes list / balances if triggers update
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wnioski do rozpatrzenia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : requests.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Od pracowników zespołu
                        </p>
                    </CardContent>
                </Card>
            </div>

            {debugInfo && (debugInfo.teamError || debugInfo.reqError) && (
                <div className="p-4 bg-red-50 text-red-900 border border-red-200 rounded-md text-sm font-mono overflow-auto">
                    <strong>Błędy zapytania bazy danych:</strong><br />
                    Zarządzanie: {JSON.stringify(debugInfo.teamError)}<br />
                    Wnioski: {JSON.stringify(debugInfo.reqError)}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Oczekujące Wnioski</CardTitle>
                        <CardDescription>Zatwierdź lub odrzuć odbiór nadgodzin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <p className="text-sm text-muted">Ładowanie...</p>
                            ) : requests.length === 0 ? (
                                <p className="text-sm text-muted">Brak oczekujących wniosków.</p>
                            ) : (
                                requests.map(req => (
                                    <div key={req.id} className="flex flex-col gap-3 rounded-lg border p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium">{req.users.full_name}</div>
                                            <Badge variant="secondary">{req.hours}h {req.compensation_mode}</Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Prośba {req.hours < 0 ? 'o odbiór' : 'dodania'} godzin za datę {req.request_date}
                                        </div>
                                        <div className="flex gap-2 justify-end mt-2">
                                            <Button variant="outline" size="sm" onClick={() => handleResolve(req.id, false)}>Odrzuć</Button>
                                            <Button size="sm" onClick={() => handleResolve(req.id, true)}>Zatwierdź</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Twój Zespół</CardTitle>
                        <CardDescription>Salda nadgodzin pracowników.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 border rounded-md p-2">
                            {loading ? (
                                <p className="p-2 text-sm text-muted">Ładowanie...</p>
                            ) : team.length === 0 ? (
                                <p className="p-2 text-sm text-muted">Nie masz przypisanych pracowników.</p>
                            ) : (
                                team.map(member => (
                                    <div key={member.id} className="flex items-center justify-between border-b p-2 last:border-0">
                                        <div>
                                            <div className="font-medium">{member.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{member.role === 'employee' ? 'Pracownik' : 'Inny'}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold text-lg ${member.overtime_balance.balance_hours < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {member.overtime_balance.balance_hours} h
                                            </span>
                                            <Button variant="secondary" size="sm" onClick={() => handleForceOvertime(member.id)}>Zleć 1:1.5</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
