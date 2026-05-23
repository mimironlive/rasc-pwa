import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingGrid from '@/components/BookingGrid'
import type { Session, Member } from '@/lib/supabase/types'

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, member:members(id, name)')
    .eq('date', today)
    .order('start_time')

  // Try matching by phone — Supabase may store it with or without + prefix
  const phone = user.phone ?? ''
  const phoneAlt = phone.startsWith('+') ? phone.slice(1) : `+${phone}`

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .or(`phone.eq.${phone},phone.eq.${phoneAlt}`)
    .limit(1)

  const member = members?.[0] ?? null

  return (
    <BookingGrid
      sessions={(sessions ?? []) as (Session & { member?: Pick<Member, 'id' | 'name'> })[]}
      currentMember={member as Member | null}
      today={today}
    />
  )
}
