import { createClient } from './server'

export type UserRole = 'employee' | 'manager' | 'hr'

export interface AppUser {
    id: string
    email: string
    full_name: string
    role: UserRole
    manager_id: string | null
}

export async function getUser(): Promise<AppUser | null> {
    const supabase = await createClient()

    // 1. Get auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    // 2. Fetch extended user profile from public.users table
    const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (dbError || !profile) {
        console.error('Error fetching user profile:', dbError)
        return null
    }

    return profile as AppUser
}
