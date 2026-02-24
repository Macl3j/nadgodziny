import { getUser } from '@/utils/supabase/getUser'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/login')
    redirect('/login')
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white dark:bg-slate-900 px-6 sm:px-10">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <span className="text-xl">Hurst nadgodziny</span>
                </Link>
                <div className="ml-auto flex items-center gap-4">
                    <div className="text-sm font-medium hidden sm:block">
                        {user.full_name} ({user.role})
                    </div>
                    <form action={signOut}>
                        <Button variant="outline" size="sm">
                            Wyloguj
                        </Button>
                    </form>
                </div>
            </header>
            <main className="flex-1 p-6 sm:p-10">
                {children}
            </main>
        </div>
    )
}
