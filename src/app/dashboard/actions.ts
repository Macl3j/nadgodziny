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
    const requestDate = formData.get('date') as string

    const { error } = await supabase.from('overtime_requests').insert({
        user_id: user.id,
        manager_id: manager.id,
        hours: hours,
        request_date: requestDate,
        compensation_mode: '1:1', // employee requests are always 1:1
        is_manager_initiated: false,
        status: 'pending'
    })

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
