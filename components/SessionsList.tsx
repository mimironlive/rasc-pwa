'use client'

import { useState } from 'react'
import type { Session } from '@/lib/supabase/types'
import { calcTableFee, calcTotal, formatDuration, formatTime } from '@/lib/billing'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending confirmation',
  confirmed: 'Paid ✓',
}
const STATUS_COLOR: Record<string, string> = {
  unpaid: '#ef4444',
  pending: '#d97706',
  confirmed: '#16a34a',
}

export default function SessionsList({ sessions: initial, memberId, memberName }: { sessions: Session[]; memberId: string; memberName: string }) {
  const [sessions, setSessions] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drinks, setDrinks] = useState<Record<string, string>>({})
  const [carpark, setCarpark] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  const CARPARK_UNIT = 2  // $2 per carpark unit

  const PAYNOW_UEN = '201833555GRAS'

  const BANKS = [
    { label: 'DBS / POSB',  scheme: 'dbsdigibank-sg://' },
    { label: 'DBS PayLah!', scheme: 'dbspaylah://' },
    { label: 'UOB TMRW',    scheme: 'uob-sg://' },
    { label: 'OCBC',        scheme: 'ocbc://' },
    { label: 'GrabPay',     scheme: 'grab://' },
    { label: 'Google Pay',  scheme: 'googlepay://' },
  ]

  function openBank(scheme: string, amount: number) {
    // Copy UEN to clipboard — paste into bank app PayNow field
    navigator.clipboard.writeText(PAYNOW_UEN).catch(() => {})
    window.location.href = scheme
  }

  async function markPaid(session: Session, method: 'paynow' | 'cash') {
    setSaving(session.id)
    const drinksCount = parseInt(drinks[session.id] || '0') || 0
    const carparkCount = parseInt(carpark[session.id] || '0') || 0
    const drinksVal = drinksCount * 1
    const carparkVal = carparkCount * CARPARK_UNIT
    const tableFee = calcTableFee(session.start_time, session.end_time, session.type)
    const total = calcTotal(tableFee, drinksVal, carparkVal)

    const { data, error } = await supabase
      .from('sessions')
      .update({
        drinks_amount: drinksVal,
        carpark_amount: carparkVal,
        table_fee: tableFee,
        total_amount: total,
        payment_status: 'pending',
        payment_method: method,
      })
      .eq('id', session.id)
      .select()
      .single()

    setSaving(null)
    if (!error && data) {
      setSessions(prev => prev.map(s => s.id === session.id ? data : s))
      setExpanded(null)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <Link href="/book" className="text-xl">←</Link>
        <div className="font-bold text-lg">My Sessions</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {sessions.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
            No sessions yet.
          </div>
        )}
        {sessions.map(s => {
          const isExpanded = expanded === s.id
          const canMarkPaid = s.payment_status === 'unpaid'
          const drinksCount = parseInt(drinks[s.id] ?? String(s.drinks_amount)) || 0
          const carparkCount = parseInt(carpark[s.id] ?? String(s.carpark_amount / CARPARK_UNIT)) || 0
          const drinksVal = drinksCount * 1
          const carparkVal = carparkCount * CARPARK_UNIT
          const tableFee = calcTableFee(s.start_time, s.end_time, s.type)
          const total = calcTotal(tableFee, drinksVal, carparkVal)

          return (
            <div key={s.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)' }}>
              {/* Summary row */}
              <button
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                onClick={() => canMarkPaid && setExpanded(isExpanded ? null : s.id)}>
                <div className="flex-1">
                  <div className="font-semibold">
                    Table {s.table_number} ·{' '}
                    <span style={{ color: s.type === 'regular' ? 'var(--regular)' : 'var(--dnd)' }}>
                      {s.type === 'regular' ? 'Regular' : 'DND'}
                    </span>
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}{formatTime(s.start_time)}–{formatTime(s.end_time)}
                    {' · '}{formatDuration(s.start_time, s.end_time)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${s.total_amount.toFixed(2)}</div>
                  <div className="text-xs mt-0.5" style={{ color: STATUS_COLOR[s.payment_status] }}>
                    {STATUS_LABEL[s.payment_status]}
                  </div>
                </div>
              </button>

              {/* Expanded: add drinks/carpark + mark paid */}
              {isExpanded && canMarkPaid && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex gap-4 mt-3">
                    {/* Drinks: − count + */}
                    <div className="flex-1">
                      <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                        Drinks · ${drinksVal.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDrinks(prev => ({ ...prev, [s.id]: String(Math.max(0, drinksCount - 1)) }))}
                          className="w-10 h-10 rounded-lg text-xl font-bold flex items-center justify-center"
                          style={{ background: 'var(--surface-2)', color: 'var(--foreground)' }}>
                          −
                        </button>
                        <div className="flex-1 text-center font-bold text-lg">{drinksCount}</div>
                        <button
                          onClick={() => setDrinks(prev => ({ ...prev, [s.id]: String(drinksCount + 1) }))}
                          className="w-10 h-10 rounded-lg text-xl font-bold flex items-center justify-center"
                          style={{ background: 'var(--surface-2)', color: 'var(--foreground)' }}>
                          +
                        </button>
                      </div>
                    </div>
                    {/* Carpark: 0 1 2 at $2 each */}
                    <div className="flex-1">
                      <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                        Carpark · ${carparkVal.toFixed(2)}
                      </div>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(n => (
                          <button key={n}
                            onClick={() => setCarpark(prev => ({ ...prev, [s.id]: String(n) }))}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold border"
                            style={{
                              background: carparkCount === n ? 'var(--regular)' : 'var(--surface-2)',
                              borderColor: carparkCount === n ? 'var(--regular)' : 'var(--border)',
                              color: carparkCount === n ? 'white' : 'var(--muted)',
                            }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="flex justify-between items-center">
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        Table ${tableFee.toFixed(2)}
                        {drinksVal > 0 && ` + Drinks $${drinksVal.toFixed(2)}`}
                        {carparkVal > 0 && ` + Carpark $${carparkVal.toFixed(2)}`}
                      </div>
                      <div className="font-bold text-xl">${total.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* PayNow section */}
                  <div className="flex flex-col gap-2">
                    {/* UEN tap-to-copy */}
                    <button
                      onClick={() => navigator.clipboard.writeText(PAYNOW_UEN).catch(() => {})}
                      className="rounded-xl px-4 py-3 text-left"
                      style={{ background: 'var(--surface-2)' }}>
                      <div className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>PayNow UEN · tap to copy</div>
                      <div className="font-mono font-bold tracking-wide">{PAYNOW_UEN}</div>
                    </button>
                    {/* Steps */}
                    <div className="text-xs px-1" style={{ color: 'var(--muted)' }}>
                      1. Tap your bank below — UEN copied to clipboard<br />
                      2. Go to PayNow → paste UEN<br />
                      3. Enter <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>${total.toFixed(2)}</span> · add your name in remarks
                    </div>
                    {/* Bank buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {BANKS.map(bank => (
                        <button key={bank.label}
                          onClick={() => openBank(bank.scheme, total)}
                          className="py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center"
                          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                          {bank.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => markPaid(s, 'paynow')}
                      disabled={saving === s.id}
                      className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                      style={{ background: 'var(--accent)' }}>
                      {saving === s.id ? 'Saving…' : "Done — I've sent PayNow"}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>or</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>

                  {/* Cash */}
                  <button
                    onClick={() => markPaid(s, 'cash')}
                    disabled={saving === s.id}
                    className="w-full py-3 rounded-xl font-semibold border disabled:opacity-40"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface-2)' }}>
                    Pay Cash to Admin
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
