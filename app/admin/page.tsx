import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/AdminDashboard'
import type { Session, Member } from '@/lib/supabase/types'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const phone = user.phone ?? ''
  const phoneAlt = phone.startsWith('+') ? phone.slice(1) : `+${phone}`
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .or(`phone.eq.${phone},phone.eq.${phoneAlt}`)
    .limit(1)

  const m = (members?.[0] ?? null) as Member | null
  if (!m?.is_admin) redirect('/book')

  const since = new Date()
  since.setDate(since.getDate() - 14)
  const sinceStr = since.toLocaleDateString('en-CA')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, member:members(id, name, phone)')
    .gte('date', sinceStr)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  type SessionWithMember = Session & { member?: Pick<Member, 'id' | 'name' | 'phone'> }
  return <AdminDashboard sessions={(sessions ?? []) as SessionWithMember[]} />
}
