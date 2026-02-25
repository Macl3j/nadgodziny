'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitOvertimeRequest(formData: FormData) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Nie autoryzowano')

    // In a real app we would get the true manager of this user
    // For this prototype, we'll try to find any manager
    const { data: manager } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'manager')
        .limit(1)
        .single()

    if (!manager) {
        throw new Error('Brak zdefiniowanego przełożonego')
    }

    const hours = parseFloat(formData.get('hours') as string)
    const dateFrom = formData.get('date_from') as string
    const dateTo = formData.get('date_to') as string

    if (!dateFrom || !dateTo) {
        throw new Error('Należy podać datę początkową i końcową.')
    }

    const start = new Date(dateFrom)
    const end = new Date(dateTo)

    if (end < start) {
        throw new Error('Data końcowa nie może być wcześniejsza niż data początkowa.')
    }

    let datesToInsert: string[] = []
    let currentDate = new Date(start)

    while (currentDate <= end) {
        const day = currentDate.getDay()
        // 0 = Sunday, 6 = Saturday
        if (day !== 0 && day !== 6) {
            datesToInsert.push(currentDate.toISOString().split('T')[0])
        }
        currentDate.setDate(currentDate.getDate() + 1)
    }

    if (datesToInsert.length === 0) {
        throw new Error('Wybrany zakres nie obejmuje dni roboczych.')
    }

    const hoursPerDay = hours / datesToInsert.length

    if (hoursPerDay < -8) {
        throw new Error(`Nie możesz odebrać więcej niż 8 godzin średnio na jeden dzień roboczy. (Wybrano ${datesToInsert.length} dni, wychodzi ${hoursPerDay.toFixed(1)}h na dzień)`)
    }

    // Check if request for any of these dates already exists
    const { data: existingRequests } = await supabase
        .from('overtime_requests')
        .select('request_date')
        .eq('user_id', user.id)
        .in('request_date', datesToInsert)

    if (existingRequests && existingRequests.length > 0) {
        const duplicateDates = existingRequests.map(r => r.request_date).join(', ')
        throw new Error(`Złożyłeś już wniosek na niektóre z tych dni: ${duplicateDates}`)
    }

    const inserts = datesToInsert.map(date => ({
        user_id: user.id,
        manager_id: manager.id,
        hours: hoursPerDay,
        request_date: date,
        compensation_mode: '1:1', // employee requests are always 1:1
        is_manager_initiated: false,
        status: 'pending'
    }))

    const { error } = await supabase.from('overtime_requests').insert(inserts)

    if (error) {
        console.error('Błąd zapisu wniosku', error)
        throw new Error('Błąd zapisu wniosku')
    }

    revalidatePath('/dashboard')
}

export async function submitForcedOvertime(formData: FormData) {
    const supabase = await createClient()

    const employeeId = formData.get('employee_id') as string
    const hours = parseFloat(formData.get('hours') as string)
    const requestDate = formData.get('date') as string

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Nie autoryzowano')

    const { error } = await supabase.from('overtime_requests').insert({
        user_id: employeeId,
        manager_id: user.id,
        hours: hours,
        request_date: requestDate,
        compensation_mode: '1:1.5', // manager forced are always 1:1.5
        is_manager_initiated: true,
        status: 'approved' // Automatically approved since it's forced
    })

    if (error) {
        console.error('Błąd zlecenia narzuconego', error)
        throw new Error('Błąd zapisu')
    }

    const { data: balanceData } = await supabase
        .from('overtime_balance')
        .select('balance_hours')
        .eq('user_id', employeeId)
        .single()

    if (balanceData) {
        const addedHours = hours * 1.5
        await supabase
            .from('overtime_balance')
            .update({ balance_hours: balanceData.balance_hours + addedHours })
            .eq('user_id', employeeId)
    }

    revalidatePath('/dashboard')
}

export async function resolveRequest(requestId: string, approve: boolean) {
    const supabase = await createClient()

    const { data: request } = await supabase
        .from('overtime_requests')
        .select('*')
        .eq('id', requestId)
        .single()

    if (!request) throw new Error('Nie znaleziono wniosku')

    const { error } = await supabase
        .from('overtime_requests')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', requestId)

    if (error) {
        throw new Error('Błąd rozpatrywania wniosku')
    }

    if (approve) {
        const { data: balanceData } = await supabase
            .from('overtime_balance')
            .select('balance_hours')
            .eq('user_id', request.user_id)
            .single()

        if (balanceData) {
            await supabase
                .from('overtime_balance')
                .update({ balance_hours: balanceData.balance_hours + request.hours })
                .eq('user_id', request.user_id)
        }
    }

    revalidatePath('/dashboard')
}
