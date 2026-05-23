'use client'

import { useState } from 'react'
import type { Session, Member } from '@/lib/supabase/types'
import { formatTime, formatDuration } from '@/lib/billing'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type SessionWithMember = Session & { member?: Pick<Member, 'id' | 'name' | 'phone'> }

const STATUS_COLOR: Record<string, string> = {
  unpaid: '#6b7280',
  pending: '#d97706',
  confirmed: '#16a34a',
}

export default function AdminDashboard({ sessions: initial }: { sessions: SessionWithMember[] }) {
  const [sessions, setSessions] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'pending' | 'unpaid'>('all')
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  async function confirm(id: string) {
    setSaving(id)
    const { data } = await supabase
      .from('sessions')
      .update({ payment_status: 'confirmed' })
      .eq('id', id)
      .select('*, member:members(id, name, phone)')
      .single()
    setSaving(null)
    if (data) setSessions(prev => prev.map(s => s.id === id ? data as SessionWithMember : s))
  }

  const filtered = sessions.filter(s =>
    filter === 'all' ? true : s.payment_status === filter
  )

  const totalPending = sessions
    .filter(s => s.payment_status === 'pending')
    .reduce((sum, s) => sum + s.total_amount, 0)

  const totalConfirmed = sessions
    .filter(s => s.payment_status === 'confirmed')
    .reduce((sum, s) => sum + s.total_amount, 0)

  // Build tally text for copy-paste
  function buildTally(): string {
    const grouped: Record<string, SessionWithMember[]> = {}
    sessions.forEach(s => {
      const name = s.member?.name ?? 'Unknown'
      if (!grouped[name]) grouped[name] = []
      grouped[name].push(s)
    })
    const since = new Date(); since.setDate(since.getDate() - 14)
    const lines = [`RASC Tally (last 14 days)\n`]
    Object.entries(grouped).forEach(([name, ss]) => {
      const total = ss.reduce((sum, s) => sum + s.total_amount, 0)
      const paid = ss.every(s => s.payment_status === 'confirmed')
      const status = paid ? 'PAID ✓' : 'OUTSTANDING ✗'
      lines.push(`${name.padEnd(20)} $${total.toFixed(2).padStart(7)}   ${status}`)
    })
    const outstanding = sessions
      .filter(s => s.payment_status !== 'confirmed')
      .reduce((sum, s) => sum + s.total_amount, 0)
    lines.push(`\nCollected:    $${totalConfirmed.toFixed(2)}`)
    lines.push(`Outstanding:  $${outstanding.toFixed(2)}`)
    return lines.join('\n')
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="px-4 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/book" className="text-xl">←</Link>
          <div className="font-bold text-lg">Admin</div>
        </div>
        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Pending</div>
            <div className="font-bold text-amber-400">${totalPending.toFixed(2)}</div>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Confirmed</div>
            <div className="font-bold" style={{ color: 'var(--accent)' }}>${totalConfirmed.toFixed(2)}</div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(buildTally())}
            className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold"
            style={{ background: 'var(--surface-2)', color: 'var(--foreground)' }}>
            Copy Tally
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {(['all', 'pending', 'unpaid'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-2.5 text-sm font-medium capitalize transition-colors"
            style={{ color: filter === f ? 'var(--foreground)' : 'var(--muted)',
              borderBottom: filter === f ? '2px solid var(--accent)' : '2px solid transparent' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--muted)' }}>No sessions.</div>
        )}
        {filtered.map(s => (
          <div key={s.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'var(--surface)' }}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{s.member?.name ?? 'Unknown'}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {new Date(s.date + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}T{s.table_number}{' · '}
                {formatTime(s.start_time)}–{formatTime(s.end_time)}{' · '}
                {s.type === 'dnd' ? 'DND' : 'Reg'}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold">${s.total_amount.toFixed(2)}</div>
              {s.payment_status === 'pending' ? (
                <button
                  onClick={() => confirm(s.id)}
                  disabled={saving === s.id}
                  className="text-xs mt-1 px-2 py-1 rounded-lg font-semibold disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  {saving === s.id ? '…' : 'Confirm'}
                </button>
              ) : (
                <div className="text-xs mt-1" style={{ color: STATUS_COLOR[s.payment_status] }}>
                  {s.payment_status === 'confirmed' ? 'Paid ✓' : 'Unpaid'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
