import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionsList from '@/components/SessionsList'
import type { Session, Member } from '@/lib/supabase/types'

export default async function SessionsPage() {
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
  if (!m) redirect('/login')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('member_id', m.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(30)

  return <SessionsList sessions={(sessions ?? []) as Session[]} memberId={m.id} memberName={m.name} />
}
